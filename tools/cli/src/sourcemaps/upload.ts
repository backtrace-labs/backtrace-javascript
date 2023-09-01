import {
    ArchiveWithSourceMapsAndDebugIds,
    Asset,
    AssetWithContent,
    AsyncResult,
    createArchive,
    createWriteStream,
    DebugIdGenerator,
    Err,
    failIfEmpty,
    filter,
    finalizeArchive,
    loadSourceMap,
    log,
    map,
    matchSourceMapExtension,
    Ok,
    pass,
    pipeStream,
    RawSourceMap,
    Result,
    SourceProcessor,
    stripSourcesContent,
    SymbolUploader,
    uploadArchive,
    UploadResult,
} from '@backtrace-labs/sourcemap-tools';
import { GlobalOptions } from '..';
import { Command, CommandContext } from '../commands/Command';
import { toAsset } from '../helpers/common';
import { find } from '../helpers/find';
import { logAsset } from '../helpers/logs';
import { normalizePaths } from '../helpers/normalizePaths';
import { CliLogger } from '../logger';
import { loadAndJoinOptions } from '../options/loadOptions';

export interface UploadOptions extends GlobalOptions {
    readonly url: string;
    readonly subdomain: string;
    readonly token: string;
    readonly path: string[];
    readonly 'include-sources': string;
    readonly insecure: boolean;
    readonly 'dry-run': boolean;
    readonly force: boolean;
    readonly 'pass-with-no-files': boolean;
    readonly output: string;
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
        name: 'url',
        type: String,
        description: 'URL to upload to. You can use also BACKTRACE_JS_UPLOAD_URL env variable.',
        alias: 'u',
    })
    .option({
        name: 'subdomain',
        type: String,
        description: 'Subdomain to upload to.',
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
        name: 'output',
        alias: 'o',
        description: 'If set, archive with sourcemaps will be outputted to this path instead of being uploaded.',
        type: String,
    })
    .execute((context) => AsyncResult.equip(uploadSourcemaps(context)).then(output(context.logger)).inner);

/**
 * Uploads sourcemaps found in path(s).
 */
export async function uploadSourcemaps({ opts, logger, getHelpMessage }: CommandContext<UploadOptions>) {
    const sourceProcessor = new SourceProcessor(new DebugIdGenerator());

    const optsResult = await loadAndJoinOptions(opts.config)('upload', opts, {
        url: process.env.BACKTRACE_JS_UPLOAD_URL,
    });

    if (optsResult.isErr()) {
        return optsResult;
    }

    opts = optsResult.data;

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

    const isAssetProcessedCommand = (asset: Asset) =>
        AsyncResult.fromValue<Asset, string>(asset)
            .then(logTraceAsset('checking if asset is processed'))
            .then(isAssetProcessed(sourceProcessor))
            .then(
                logDebug(
                    ({ asset, result }) =>
                        `${asset.name}: ` + (result ? 'asset is processed' : 'asset is not processed'),
                ),
            )
            .thenErr((error) => `${asset.name}: ${error}`).inner;

    const filterProcessedAssetsCommand = (assets: Asset[]) =>
        AsyncResult.fromValue<Asset[], string>(assets)
            .then(map(isAssetProcessedCommand))
            .then(filter((f) => f.result))
            .then(map((f) => f.asset)).inner;

    const loadSourceMapCommand = (asset: Asset) =>
        AsyncResult.fromValue<Asset, string>(asset)
            .then(logTraceAsset('loading sourcemap'))
            .then(loadSourceMap)
            .then(logDebugAsset('loaded sourcemap'))
            .then(opts['include-sources'] ? pass : stripSourcesContent).inner;

    const createArchiveCommand = (assets: AssetWithContent<RawSourceMap>[]) =>
        AsyncResult.fromValue<AssetWithContent<RawSourceMap>[], string>(assets)
            .then(logTrace('creating archive'))
            .then(createArchive(sourceProcessor))
            .then(logDebug('archive created')).inner;

    const writeArchiveCommand = (outputPath: string) => (archive: ArchiveWithSourceMapsAndDebugIds) =>
        AsyncResult.fromValue<ArchiveWithSourceMapsAndDebugIds, string>(archive)
            .then(logTrace(`saving archive to ${outputPath}`))
            .then(({ assets, archive }) => {
                return AsyncResult.equip(createWriteStream(outputPath))
                    .then(pipeStream(archive))
                    .then(() => finalizeArchive({ assets, archive })).inner;
            })
            .then<UploadResultWithAssets>(() => ({ rxid: outputPath, assets: archive.assets }))
            .then(logDebug(`saved archive to ${outputPath}`)).inner;

    const uploadArchiveCommand = (uploadUrl: string) => (archive: ArchiveWithSourceMapsAndDebugIds) =>
        AsyncResult.fromValue<ArchiveWithSourceMapsAndDebugIds, string>(archive)
            .then(logTrace(`uploading archive to ${uploadUrl}`))
            .then(async ({ assets, archive }) => {
                const uploader = uploadArchive(new SymbolUploader(uploadUrl, { ignoreSsl: opts.insecure ?? false }));

                // We first create the upload request, which pipes the archive to itself
                const promise = uploader(archive);

                // Next we finalize the archive, which causes the assets to be written to the archive,
                // and consequently to the request
                await finalizeArchive({ assets, archive });

                // Finally, we return the upload request promise
                return promise;
            })
            .then<UploadResultWithAssets>((result) => ({ ...result, assets: archive.assets }))
            .then(logDebug(`archive uploaded to ${uploadUrl}`)).inner;

    const saveArchiveCommand = outputPath
        ? writeArchiveCommand(outputPath)
        : uploadUrl
        ? uploadArchiveCommand(uploadUrl)
        : undefined;

    if (!saveArchiveCommand) {
        throw new Error('processArchive function should be defined');
    }

    return AsyncResult.equip(find(...searchPaths))
        .then(logDebug((r) => `found ${r.length} files`))
        .then(map(logTrace((result) => `found file: ${result.path}`)))
        .then(filter((t) => t.direct || matchSourceMapExtension(t.path)))
        .then(map((t) => t.path))
        .then(logDebug((r) => `found ${r.length} files for upload`))
        .then(map(logTrace((path) => `file for upload: ${path}`)))
        .then(opts['pass-with-no-files'] ? Ok : failIfEmpty('no sourcemaps found'))
        .then(map(toAsset))
        .then(opts.force ? Ok : filterProcessedAssetsCommand)
        .then(map(loadSourceMapCommand))
        .then(logDebug((r) => `uploading ${r.length} files`))
        .then(map(logTrace(({ path }) => `file to upload: ${path}`)))
        .then(
            opts['pass-with-no-files']
                ? Ok
                : failIfEmpty('no processed sourcemaps found, make sure to run process first'),
        )
        .then(createArchiveCommand)
        .then((archive) =>
            opts['dry-run']
                ? Ok<UploadResultWithAssets>({ rxid: '<dry-run>', assets: archive.assets })
                : saveArchiveCommand(archive),
        ).inner;
}

function validateUrl(url: string) {
    try {
        new URL(url);
        return Ok(url);
    } catch {
        return Err(`invalid URL: ${url}`);
    }
}

function getUploadUrl(opts: Partial<UploadOptions>): Result<string | undefined, string> {
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

function isAssetProcessed(sourceProcessor: SourceProcessor) {
    return function isAssetProcessed(asset: Asset) {
        return AsyncResult.equip(sourceProcessor.isSourceMapFileProcessed(asset.path)).then(
            (result) => ({ asset, result } as const),
        ).inner;
    };
}

function output(logger: CliLogger) {
    return function output(result: UploadResult) {
        logger.output(result.rxid);
        return result;
    };
}
