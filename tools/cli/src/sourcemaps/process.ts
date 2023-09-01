import {
    Asset,
    AsyncResult,
    DebugIdGenerator,
    Err,
    failIfEmpty,
    filter,
    log,
    map,
    matchSourceExtension,
    Ok,
    processAsset,
    ProcessAssetError,
    ProcessAssetResult,
    SourceProcessor,
    writeAsset,
} from '@backtrace-labs/sourcemap-tools';
import { GlobalOptions } from '..';
import { Command } from '../commands/Command';
import { find } from '../helpers/find';
import { logAsset } from '../helpers/logs';
import { normalizePaths } from '../helpers/normalizePaths';
import { CliLogger, createLogger } from '../logger';
import { loadAndJoinOptions } from '../options/loadOptions';

export interface ProcessOptions extends GlobalOptions {
    readonly path: string | string[];
    readonly 'dry-run': boolean;
    readonly force: boolean;
    readonly 'pass-with-no-files': boolean;
}

export const processCmd = new Command<ProcessOptions>({
    name: 'process',
    description: 'Processing source and sourcemap files',
})
    .option({
        name: 'path',
        description: 'Path to sourcemap files or directories containing sourcemaps to upload.',
        defaultOption: true,
        multiple: true,
        alias: 'p',
    })
    .option({
        name: 'dry-run',
        alias: 'n',
        type: Boolean,
        description: 'Does not modify the files at the end.',
    })
    .option({
        name: 'force',
        alias: 'f',
        type: Boolean,
        description: 'Processes files even if already processed.',
    })
    .option({
        name: 'pass-with-no-files',
        type: Boolean,
        description: 'Exits with zero exit code if no files for processing are found.',
    })
    .execute(async function (opts, stack) {
        const logger = createLogger(opts);
        const sourceProcessor = new SourceProcessor(new DebugIdGenerator());

        const optsResult = await loadAndJoinOptions(opts.config)('process', opts, {
            path: process.cwd(),
        });

        if (optsResult.isErr()) {
            return optsResult;
        }

        opts = optsResult.data;

        logger.trace(`resolved options: \n${JSON.stringify(opts, null, '  ')}`);

        const searchPaths = normalizePaths(opts.path, process.cwd());
        if (!searchPaths) {
            logger.info(this.getHelpMessage(stack));
            return Err('path must be specified');
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

        const filterUnprocessedAssetsCommand = (assets: Asset[]) =>
            AsyncResult.fromValue<Asset[], string>(assets)
                .then(map(isAssetProcessedCommand))
                .then(filter((f) => !f.result))
                .then(map((f) => f.asset)).inner;

        const processCommand = (asset: Asset) =>
            AsyncResult.fromValue<Asset, ProcessAssetError>(asset)
                .then(logTraceAsset('processing file'))
                .then(processAsset(sourceProcessor))
                .then(logDebugAsset('file processed'))
                .thenErr(({ asset, error }) => `${asset.name}: ${error}`).inner;

        const writeCommand = (result: ProcessAssetResult) =>
            AsyncResult.fromValue<ProcessAssetResult, ProcessAssetError>(result)
                .then(logTraceAsset('writing file'))
                .then(writeAsset)
                .then(logDebugAsset('file written'))
                .thenErr(({ asset, error }) => `${asset.name}: ${error}`).inner;

        return AsyncResult.equip(find(...searchPaths))
            .then(logDebug((r) => `found ${r.length} files`))
            .then(map(logTrace((result) => `found file: ${result.path}`)))
            .then(filter((t) => t.direct || matchSourceExtension(t.path)))
            .then(map((t) => t.path))
            .then(logDebug((r) => `found ${r.length} files for processing`))
            .then(map(logTrace((path) => `file for processing: ${path}`)))
            .then(opts['pass-with-no-files'] ? Ok : failIfEmpty('no source files found'))
            .then(map(toAsset))
            .then(opts.force ? Ok : filterUnprocessedAssetsCommand)
            .then(logDebug((r) => `processing ${r.length} files`))
            .then(map(logTrace(({ path }) => `file to process: ${path}`)))
            .then(
                opts['pass-with-no-files']
                    ? Ok
                    : failIfEmpty('no files for processing found, they may be already processed'),
            )
            .then(map(processCommand))
            .then(opts['dry-run'] ? Ok : map(writeCommand))
            .then(map(output(logger)))
            .then(() => 0).inner;
    });

function toAsset(file: string): Asset {
    return { name: file, path: file };
}

function isAssetProcessed(sourceProcessor: SourceProcessor) {
    return function isAssetProcessed(asset: Asset) {
        return AsyncResult.equip(sourceProcessor.isSourceFileProcessed(asset.path)).then(
            (result) => ({ asset, result } as const),
        ).inner;
    };
}

function output(logger: CliLogger) {
    return function output(result: ProcessAssetResult) {
        logger.output(result.result.sourcePath);
        return result;
    };
}
