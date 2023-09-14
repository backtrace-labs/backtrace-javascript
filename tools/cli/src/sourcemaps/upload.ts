import {
    Asset,
    AssetWithContent,
    DebugIdGenerator,
    Err,
    failIfEmpty,
    filter,
    filterAsync,
    flow,
    log,
    LogLevel,
    map,
    mapAsync,
    matchSourceMapExtension,
    not,
    Ok,
    pass,
    pipe,
    pipeStream,
    R,
    RawSourceMap,
    RawSourceMapWithDebugId,
    Result,
    ResultPromise,
    SourceProcessor,
    stripSourcesContent,
    SymbolUploader,
    SymbolUploaderOptions,
    UploadResult,
    ZipArchive,
} from '@backtrace-labs/sourcemap-tools';
import fs from 'fs';
import path from 'path';
import { Writable } from 'stream';
import { GlobalOptions } from '..';
import { Command, CommandContext } from '../commands/Command';
import { isAssetProcessed, readSourceMapFromPathOrFromSource, toAsset, uniqueBy, validateUrl } from '../helpers/common';
import { ErrorBehaviors, filterBehaviorSkippedElements, getErrorBehavior, handleError } from '../helpers/errorBehavior';
import { buildIncludeExclude, find } from '../helpers/find';
import { logAsset } from '../helpers/logs';
import { normalizePaths, relativePaths } from '../helpers/normalizePaths';
import { CliLogger } from '../logger';
import { findConfig, loadOptionsForCommand } from '../options/loadOptions';

export interface UploadOptions extends GlobalOptions {
    readonly url: string;
    readonly path: string | string[];
    readonly include: string | string[];
    readonly exclude: string | string[];
    readonly 'include-sources': boolean;
    readonly insecure: boolean;
    readonly 'dry-run': boolean;
    readonly force: boolean;
    readonly 'pass-with-no-files': boolean;
    readonly output: string;
    readonly 'asset-error-behavior': string;
}

export interface UploadResultWithAssets extends UploadResult {
    readonly assets: Asset[];
}

export const uploadCmd = new Command<UploadOptions>({
    name: 'upload',
    description: 'Uploading of sourcemaps to Backtrace',
})
    .option({
        name: 'path',
        type: String,
        description: 'Path to sourcemap files or directories containing sourcemaps to upload.',
        defaultOption: true,
        multiple: true,
        alias: 'p',
    })
    .option({
        name: 'include',
        description: 'Includes specified paths.',
        type: String,
        multiple: true,
        alias: 'i',
    })
    .option({
        name: 'exclude',
        description: 'Excludes specified paths.',
        type: String,
        multiple: true,
        alias: 'x',
    })
    .option({
        name: 'url',
        type: String,
        description: 'URL to upload to.',
        alias: 'u',
    })
    .option({
        name: 'include-sources',
        type: Boolean,
        description: 'Uploads the sourcemaps with "sourcesContent" key.',
    })
    .option({
        name: 'insecure',
        alias: 'k',
        type: Boolean,
        description: 'Disables HTTPS certificate checking.',
    })
    .option({
        name: 'dry-run',
        alias: 'n',
        type: Boolean,
        description: 'Does not upload the files at the end.',
    })
    .option({
        name: 'force',
        alias: 'f',
        type: Boolean,
        description: 'Upload files even if not processed.',
    })
    .option({
        name: 'pass-with-no-files',
        type: Boolean,
        description: 'Exits with zero exit code if no files for uploading are found.',
    })
    .option({
        name: 'asset-error-behavior',
        alias: 'e',
        type: String,
        description: `What to do when an asset fails. Can be one of: ${Object.keys(ErrorBehaviors).join(', ')}.`,
    })
    .option({
        name: 'output',
        alias: 'o',
        description: 'If set, archive with sourcemaps will be outputted to this path instead of being uploaded.',
        type: String,
    })
    .execute(uploadSourcemaps);

/**
 * Uploads sourcemaps found in path(s).
 */
export async function uploadSourcemaps({ opts, logger, getHelpMessage }: CommandContext<UploadOptions>) {
    const sourceProcessor = new SourceProcessor(new DebugIdGenerator());
    const configPath = opts.config ?? (await findConfig());
    const configResult = await loadOptionsForCommand(configPath)('upload');
    if (configResult.isErr()) {
        return configResult;
    }

    const config = configResult.data;
    opts = {
        ...config,
        ...opts,
        path:
            opts.path ??
            (config.path && configPath ? relativePaths(config.path, path.dirname(configPath)) : process.cwd()),
    };

    logger.trace(`resolved options: \n${JSON.stringify(opts, null, '  ')}`);

    const searchPaths = normalizePaths(opts.path, process.cwd());
    if (!searchPaths) {
        logger.info(getHelpMessage());
        return Err('path must be specified');
    }

    const uploadUrlResult = getUploadUrl(opts);
    if (uploadUrlResult.isErr()) {
        logger.info(getHelpMessage());
        return uploadUrlResult;
    }

    const outputPath = opts.output;
    const uploadUrl = uploadUrlResult.data;
    if (!outputPath && !uploadUrl) {
        logger.info(getHelpMessage());
        return Err('upload URL is required.');
    }

    if (outputPath && uploadUrl) {
        logger.info(getHelpMessage());
        return Err('outputting archive and uploading are exclusive');
    }

    const logDebug = log(logger, 'debug');
    const logTrace = log(logger, 'trace');
    const logDebugAsset = logAsset(logger, 'debug');
    const logTraceAsset = logAsset(logger, 'trace');

    const assetErrorBehaviorResult = getErrorBehavior(opts['asset-error-behavior'] ?? 'exit');
    if (assetErrorBehaviorResult.isErr()) {
        logger.info(getHelpMessage());
        return assetErrorBehaviorResult;
    }

    const assetErrorBehavior = assetErrorBehaviorResult.data;

    const handleFailedAsset = handleError(assetErrorBehavior);

    const logAssetBehaviorError = (asset: Asset) => (err: string, level: LogLevel) =>
        logAsset(logger, level)(err)(asset);

    const isAssetProcessedCommand = (asset: AssetWithContent<RawSourceMap>) =>
        pipe(
            asset,
            logTraceAsset('checking if asset is processed'),
            isAssetProcessed(sourceProcessor),
            logDebug(
                ({ asset, result }) => `${asset.name}: ` + (result ? 'asset is processed' : 'asset is not processed'),
            ),
        );

    const filterProcessedAssetsCommand = (assets: AssetWithContent<RawSourceMap>[]) =>
        pipe(
            assets,
            mapAsync(isAssetProcessedCommand),
            filter((f) => f.result),
            map((f) => f.asset as AssetWithContent<RawSourceMapWithDebugId>),
        );

    const loadSourceMapCommand = (asset: Asset) =>
        pipe(
            asset,
            logTraceAsset('loading sourcemap'),
            readSourceMapFromPathOrFromSource(sourceProcessor),
            R.map(logDebugAsset('loaded sourcemap')),
            R.mapErr((error) => `${asset.name}: ${error}`),
            handleFailedAsset(logAssetBehaviorError(asset)),
        );

    const saveArchiveCommandResult = await uploadOrSaveAssets(
        opts.url,
        opts.output,
        (url) => uploadAssets(url, { ignoreSsl: opts.insecure ?? false }, opts['include-sources'] ?? false),
        (path) => flow(saveAssets(path, opts['include-sources'] ?? false), Ok),
    );

    if (saveArchiveCommandResult.isErr()) {
        return saveArchiveCommandResult;
    }

    const saveArchiveCommand = saveArchiveCommandResult.data;

    const includePaths = normalizePaths(opts.include);
    const excludePaths = normalizePaths(opts.exclude);
    const { isIncluded, isExcluded } = await buildIncludeExclude(includePaths, excludePaths, logTrace);

    return pipe(
        searchPaths,
        find,
        logDebug((r) => `found ${r.length} files`),
        map(logTrace((result) => `found file: ${result.path}`)),
        isIncluded ? filterAsync(isIncluded) : pass,
        isExcluded ? filterAsync(flow(isExcluded, not)) : pass,
        filter((t) => t.direct || matchSourceMapExtension(t.path)),
        map((t) => t.path),
        logDebug((r) => `found ${r.length} files for upload`),
        map(logTrace((path) => `file for upload: ${path}`)),
        map(toAsset),
        opts['pass-with-no-files'] ? Ok : failIfEmpty('no sourcemaps found'),
        R.map(flow(mapAsync(loadSourceMapCommand), R.flatMap)),
        R.map(filterBehaviorSkippedElements),
        R.map(filterProcessedAssetsCommand),
        R.map(
            opts['pass-with-no-files']
                ? Ok
                : failIfEmpty('no processed sourcemaps found, make sure to run process first'),
        ),
        R.map(uniqueBy((asset) => asset.content.debugId)),
        R.map((assets) =>
            opts['dry-run']
                ? Ok<UploadResultWithAssets>({
                      rxid: '<dry-run>',
                      assets,
                  })
                : assets.length
                ? saveArchiveCommand(assets)
                : Ok<UploadResultWithAssets>({ rxid: '<no sourcemaps uploaded>', assets }),
        ),
        R.map(output(logger)),
    );
}

export function uploadOrSaveAssets(
    uploadUrl: string | undefined,
    outputPath: string | undefined,
    upload: (
        url: string,
    ) => (assets: AssetWithContent<RawSourceMapWithDebugId>[]) => ResultPromise<UploadResult, string>,
    save: (
        outputPath: string,
    ) => (assets: AssetWithContent<RawSourceMapWithDebugId>[]) => ResultPromise<UploadResult, string>,
) {
    if (uploadUrl && outputPath) {
        return Err('outputting archive and uploading are exclusive');
    }

    if (uploadUrl) {
        return pipe(
            uploadUrl,
            validateUrl,
            R.map((url) => upload(url)),
        );
    } else if (outputPath) {
        return Ok(save(outputPath));
    } else {
        return Err('upload url is required');
    }
}

export function uploadAssets(uploadUrl: string, options: SymbolUploaderOptions, includeSources: boolean) {
    const uploader = new SymbolUploader(uploadUrl, options);
    return function uploadAssets(
        assets: AssetWithContent<RawSourceMapWithDebugId>[],
    ): ResultPromise<UploadResult, string> {
        const { request, promise } = uploader.createUploadRequest();

        return pipe(request, pipeAssets(assets, includeSources), () => promise);
    };
}

export function saveAssets(outputPath: string, includeSources: boolean) {
    return async function saveAssets(assets: AssetWithContent<RawSourceMapWithDebugId>[]): Promise<UploadResult> {
        const stream = fs.createWriteStream(outputPath);

        return pipe(stream, pipeAssets(assets, includeSources), () => ({ rxid: outputPath } as UploadResult));
    };
}

function pipeAssets(assets: AssetWithContent<RawSourceMapWithDebugId>[], includeSources: boolean) {
    function appendToArchive(asset: AssetWithContent<RawSourceMapWithDebugId>) {
        return function appendToArchive(archive: ZipArchive) {
            const filename = `${asset.content.debugId}-${path.basename(asset.name)}`;
            archive.append(filename, JSON.stringify(includeSources ? asset.content : stripSourcesContent(asset)));
            return archive;
        };
    }

    return function pipeAssets(writable: Writable) {
        const archive = new ZipArchive();

        return pipe(
            writable,
            pipeStream(archive),
            () => assets.map(appendToArchive).map((fn) => fn(archive)),
            () => archive.finalize(),
        );
    };
}

function getUploadUrl(opts: Partial<UploadOptions>): Result<string | undefined, string> {
    if (opts.url) {
        return validateUrl(opts.url);
    }

    return Ok(undefined);
}

function output(logger: CliLogger) {
    return function output(result: UploadResult) {
        logger.output(result.rxid);
        return result;
    };
}
