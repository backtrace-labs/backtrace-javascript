import {
    Asset,
    AsyncResult,
    DebugIdGenerator,
    Err,
    Ok,
    ResultPromise,
    SourceProcessor,
    SymbolUploader,
    UploadResult,
    ZipArchive,
    archiveSourceMaps,
    failIfEmpty,
    filter,
    log,
    map,
    matchSourceMapExtension,
    uploadArchive,
    writeStream,
} from '@backtrace/sourcemap-tools';
import { Readable } from 'stream';
import { GlobalOptions } from '..';
import { Command } from '../commands/Command';
import { find } from '../helpers/find';
import { logAsset } from '../helpers/logs';
import { CliLogger, createLogger } from '../logger';

interface UploadOptions extends GlobalOptions {
    readonly url: string;
    readonly path: string[];
    readonly 'no-sources': string;
    readonly insecure: boolean;
    readonly 'dry-run': boolean;
    readonly force: boolean;
    readonly 'pass-with-no-files': boolean;
    readonly output: string;
}

interface AssetWithDebugId extends Asset {
    readonly debugId: string;
}

export const uploadCmd = new Command<UploadOptions>({
    name: 'upload',
    description: 'Uploading of sourcemaps to Backtrace',
})
    .option({
        name: 'url',
        type: String,
        description: 'URL to upload to. You can use also BACKTRACE_JS_UPLOAD_URL env variable.',
        alias: 'u',
        defaultValue: process.env.BACKTRACE_JS_UPLOAD_URL,
    })
    .option({
        name: 'path',
        type: String,
        description: 'Path to sourcemap files or directories containing sourcemaps to upload.',
        defaultOption: true,
        defaultValue: process.cwd(),
        multiple: true,
        alias: 'p',
    })
    .option({
        name: 'no-sources',
        type: Boolean,
        description: 'Uploads the sourcemaps without "sourcesContent" key.',
        defaultValue: false,
    })
    .option({
        name: 'insecure',
        alias: 'k',
        type: Boolean,
        description: 'Disables HTTPS certificate checking.',
        defaultValue: false,
    })
    .option({
        name: 'dry-run',
        alias: 'n',
        type: Boolean,
        description: 'Does not upload the files at the end.',
        defaultValue: false,
    })
    .option({
        name: 'force',
        alias: 'f',
        type: Boolean,
        description: 'Upload files even if not processed.',
        defaultValue: false,
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
    .execute(function (opts, stack) {
        const logger = createLogger(opts);
        const sourceProcessor = new SourceProcessor(new DebugIdGenerator());
        logger.trace(`resolved options: \n${JSON.stringify(opts, null, '  ')}`);

        const searchPaths = opts.path;
        if (!searchPaths) {
            logger.info(this.getHelpMessage(stack));
            return Err('path must be specified');
        }

        const outputPath = opts.output;
        const uploadUrl = opts.url;
        if (!outputPath && !uploadUrl) {
            logger.info(this.getHelpMessage(stack));
            return Err('upload URL is required.');
        }

        const logDebug = log(logger, 'debug');
        const logTrace = log(logger, 'trace');
        const logTraceAsset = logAsset(logger, 'trace');
        const logDebugAsset = logAsset(logger, 'debug');

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

        const readDebugIdCommand = (asset: Asset) =>
            AsyncResult.fromValue<Asset, string>(asset)
                .then(logTraceAsset('reading debug ID'))
                .then(readDebugId(sourceProcessor))
                .then(logDebugAsset((res) => `read debug ID: ${res.debugId}`))
                .thenErr((error) => `${asset.name}: ${error}`).inner;

        const createArchiveCommand = (assets: Asset[]) =>
            AsyncResult.fromValue<Asset[], string>(assets)
                .then(logTrace('creating archive'))
                .then((assets) => archiveSourceMaps(sourceProcessor)(assets as never)) // TODO: Fix this
                .then(logDebug('archive created')).inner;

        const saveArchiveCommand = outputPath
            ? (archive: ZipArchive) =>
                  AsyncResult.fromValue<ZipArchive, string>(archive)
                      .then(logTrace(`saving archive to ${outputPath}`))
                      .then(saveArchive(outputPath))
                      .then(logDebug(`saved archive to ${outputPath}`)).inner
            : uploadUrl
            ? (archive: ZipArchive) =>
                  AsyncResult.fromValue<ZipArchive, string>(archive)
                      .then(logTrace(`uploading archive to ${uploadUrl}`))
                      .then(uploadArchive(new SymbolUploader(uploadUrl, { ignoreSsl: opts.insecure ?? false })))
                      .then(logDebug(`archive uploaded to ${uploadUrl}`)).inner
            : undefined;

        if (!saveArchiveCommand) {
            throw new Error('processArchive function should be defined');
        }

        return AsyncResult.equip(find(...searchPaths))
            .then(logDebug((r) => `found ${r.length} files`))
            .then(map(logTrace((path) => `found file: ${path}`)))
            .then(filter(matchSourceMapExtension))
            .then(logDebug((r) => `found ${r.length} files matching sourcemap extension`))
            .then(map(logTrace((path) => `file matching extension: ${path}`)))
            .then(map(toAsset))
            .then(opts.force ? Ok : filterProcessedAssetsCommand)
            .then(map(readDebugIdCommand))
            .then(logDebug((r) => `uploading ${r.length} files`))
            .then(map(logTrace(({ path }) => `file to upload: ${path}`)))
            .then(opts['pass-with-no-files'] ? Ok : failIfEmpty('no files for uploading found'))
            .then(createArchiveCommand)
            .then((archive) => (opts['dry-run'] ? Ok(null) : saveArchiveCommand(archive)))
            .then(output(logger))
            .then(() => 0).inner;
    });

function toAsset(file: string): Asset {
    return { name: file, path: file };
}

function isAssetProcessed(sourceProcessor: SourceProcessor) {
    return function isAssetProcessed(asset: Asset) {
        return AsyncResult.equip(sourceProcessor.isSourceMapFileProcessed(asset.path)).then(
            (result) => ({ asset, result } as const),
        ).inner;
    };
}

function readDebugId(sourceProcessor: SourceProcessor) {
    return async function readDebugId(asset: Asset): ResultPromise<AssetWithDebugId, string> {
        return AsyncResult.equip(sourceProcessor.getSourceMapFileDebugId(asset.path)).then<AssetWithDebugId>(
            (debugId) => ({ ...asset, debugId }),
        ).inner;
    };
}

function saveArchive(filePath: string) {
    return async function saveArchive(stream: Readable): ResultPromise<UploadResult, string> {
        return AsyncResult.equip(writeStream([stream, filePath])).then(([, rxid]) => ({ rxid })).inner;
    };
}

function output(logger: CliLogger) {
    return function output(result: UploadResult | null) {
        logger.output(result?.rxid ?? '<dry run>');
        return result;
    };
}
