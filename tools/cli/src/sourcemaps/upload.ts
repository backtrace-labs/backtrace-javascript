import {
    Asset,
    DebugIdGenerator,
    Err,
    failIfEmpty,
    filter,
    filterAsync,
    flow,
    inspect,
    log,
    LogLevel,
    map,
    mapAsync,
    matchSourceExtension,
    not,
    Ok,
    pass,
    pipe,
    pipeStream,
    ProcessedSourceAndSourceMap,
    R,
    Result,
    ResultPromise,
    SourceAndSourceMap,
    SourceProcessor,
    SymbolUploader,
    SymbolUploaderOptions,
    UploadResult,
    ZipArchive,
} from '@backtrace/sourcemap-tools';
import fs from 'fs';
import path from 'path';
import { Writable } from 'stream';
import { GlobalOptions } from '..';
import { Command, CommandContext } from '../commands/Command';
import {
    loadAssetsDebugId,
    readSourceAndSourceMap,
    stripSourcesFromAssets,
    toSourceAndSourceMapPaths,
    uniqueBy,
    validateUrl,
} from '../helpers/common';
import { ErrorBehaviors, filterBehaviorSkippedElements, getErrorBehavior, handleError } from '../helpers/errorBehavior';
import { buildIncludeExclude, findTuples } from '../helpers/find';
import { createAssetLogger, logAssets } from '../helpers/logs';
import { normalizePaths, relativePaths } from '../helpers/normalizePaths';
import { CliLogger } from '../logger';
import { SourceAndOptionalSourceMap, SourceAndOptionalSourceMapPaths } from '../models/Asset';
import { findConfig, loadOptionsForCommand } from '../options/loadOptions';

export interface UploadOptions extends GlobalOptions {
    readonly url: string;
    readonly subdomain: string;
    readonly token: string;
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
    readonly assets: SourceAndOptionalSourceMap[];
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
        name: 'subdomain',
        type: String,
        description: 'Subdomain to upload to. Do not use on on-premise environments.',
        alias: 's',
    })
    .option({
        name: 'token',
        type: String,
        description: 'Symbol submission token. Required when subdomain is provided.',
        alias: 't',
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
    const logDebugAssets = logAssets(logger, 'debug');
    const logTraceAssets = logAssets(logger, 'trace');
    const logTraceAsset = createAssetLogger(logger, 'trace');

    const assetErrorBehaviorResult = getErrorBehavior(opts['asset-error-behavior'] ?? 'exit');
    if (assetErrorBehaviorResult.isErr()) {
        logger.info(getHelpMessage());
        return assetErrorBehaviorResult;
    }

    const assetErrorBehavior = assetErrorBehaviorResult.data;

    const handleFailedAsset = handleError(assetErrorBehavior);

    const logAssetBehaviorError = (asset: Asset) => (err: string, level: LogLevel) =>
        createAssetLogger(logger, level)(err)(asset);

    const isAssetProcessedCommand = (asset: SourceAndOptionalSourceMap) =>
        pipe(
            asset,
            inspect((asset) => logTraceAsset('checking if asset is processed')(asset.source)),
            loadAssetsDebugId(sourceProcessor),
            logDebug(
                ({ source, debugId }) =>
                    `${source.name}: ` + (debugId ? 'asset is processed' : 'asset is not processed'),
            ),
        );

    const filterProcessedAssetsCommand = (assets: SourceAndSourceMap[]) =>
        pipe(
            assets,
            mapAsync(isAssetProcessedCommand),
            filter((f): f is ProcessedSourceAndSourceMap => !!f.debugId),
        );

    const filterAssetsWithSourceMaps = (assets: SourceAndOptionalSourceMap[]) =>
        pipe(
            assets,
            filter((source): source is SourceAndSourceMap => !!source.sourceMap),
        );

    const readAssetCommand = (asset: SourceAndOptionalSourceMapPaths) =>
        pipe(
            asset,
            logTraceAssets('reading source and sourcemap'),
            readSourceAndSourceMap(sourceProcessor),
            R.map(logDebugAssets('read source and sourcemap')),
            R.mapErr((err) => `${asset.source.name}: ${err}`),
            handleFailedAsset(logAssetBehaviorError(asset.source)),
        );

    const saveArchiveCommandResult = await uploadOrSaveAssets(
        uploadUrl,
        opts.output,
        (url) => uploadAssets(url, { ignoreSsl: opts.insecure ?? false }),
        (path) => flow(saveAssets(path), Ok),
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
        findTuples,
        R.map(
            flow(
                logDebug((r) => `found ${r.length} files`),
                map(logTrace((result) => `found file: ${result.file1.path}`)),
                isIncluded ? filterAsync((x) => isIncluded(x.file1)) : pass,
                isExcluded ? filterAsync(flow((x) => isExcluded(x.file1), not)) : pass,
                filter((t) => t.file1.direct || matchSourceExtension(t.file1.path)),
                logDebug((r) => `found ${r.length} files for upload`),
                map(logTrace((path) => `file for upload: ${path}`)),
                map(toSourceAndSourceMapPaths),
                opts['pass-with-no-files'] ? Ok : failIfEmpty('no sourcemaps found'),
                R.map(flow(mapAsync(readAssetCommand), R.flatMap)),
                R.map(filterBehaviorSkippedElements),
                R.map(filterAssetsWithSourceMaps),
                R.map(filterProcessedAssetsCommand),
                R.map(
                    opts['pass-with-no-files']
                        ? Ok
                        : failIfEmpty('no processed sourcemaps found, make sure to run process first'),
                ),
                R.map(uniqueBy((asset) => asset.debugId)),
                R.map(opts['include-sources'] ? pass : map(stripSourcesFromAssets)),
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
            ),
        ),
    );
}

export function uploadOrSaveAssets(
    uploadUrl: string | undefined,
    outputPath: string | undefined,
    upload: (url: string) => (assets: ProcessedSourceAndSourceMap[]) => ResultPromise<UploadResult, string>,
    save: (outputPath: string) => (assets: ProcessedSourceAndSourceMap[]) => ResultPromise<UploadResult, string>,
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

export function uploadAssets(uploadUrl: string, options: SymbolUploaderOptions) {
    const uploader = new SymbolUploader(uploadUrl, options);
    return function uploadAssets(assets: ProcessedSourceAndSourceMap[]): ResultPromise<UploadResult, string> {
        const { request, promise } = uploader.createUploadRequest();
        pipeAssets(assets)(request);
        return promise;
    };
}

export function saveAssets(outputPath: string) {
    return function saveAssets(assets: ProcessedSourceAndSourceMap[]): Promise<UploadResult> {
        const stream = fs.createWriteStream(outputPath);
        return pipe(stream, pipeAssets(assets), () => ({ rxid: outputPath } as UploadResult));
    };
}

function pipeAssets(assets: ProcessedSourceAndSourceMap[]) {
    function appendToArchive(archive: ZipArchive) {
        return function appendToArchive(asset: ProcessedSourceAndSourceMap) {
            const filename = `${asset.debugId}-${path.basename(asset.sourceMap.name)}`;
            archive.append(filename, JSON.stringify(asset.sourceMap.content));
            return archive;
        };
    }

    return function pipeAssets(writable: Writable) {
        const archive = new ZipArchive();

        const waitForFinish = new Promise((resolve, reject) => writable.on('finish', resolve).on('error', reject));

        return pipe(
            writable,
            pipeStream(archive.stream),
            () => pipe(assets, map(appendToArchive(archive))),
            () => archive.finalize(),
            () => waitForFinish,
        );
    };
}

export function getUploadUrl(opts: Partial<UploadOptions>): Result<string | undefined, string> {
    if (opts.url && opts.subdomain) {
        return Err('--url and --subdomain are exclusive');
    }

    if (opts.url) {
        return validateUrl(opts.url);
    }

    if (opts.subdomain) {
        if (!opts.token) {
            return Err('token is required with subdomain');
        }

        return Ok(`https://submit.backtrace.io/${opts.subdomain}/${opts.token}/sourcemap`);
    }

    return Ok(undefined);
}

function output(logger: CliLogger) {
    return function output(result: UploadResult) {
        logger.output(result.rxid);
        return result;
    };
}
