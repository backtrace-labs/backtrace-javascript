import {
    Asset,
    AsyncResult,
    DebugIdGenerator,
    Err,
    failIfEmpty,
    filter,
    log,
    LogLevel,
    map,
    matchSourceExtension,
    Ok,
    processAsset,
    ProcessAssetError,
    ProcessAssetResult,
    Result,
    SourceProcessor,
    writeAsset,
} from '@backtrace-labs/sourcemap-tools';
import path from 'path';
import { GlobalOptions } from '..';
import { Command, CommandContext } from '../commands/Command';
import { toAsset } from '../helpers/common';
import {
    ErrorBehavior,
    ErrorBehaviors,
    filterFailedElements,
    GetErrorBehavior,
    handleError,
} from '../helpers/errorBehavior';
import { find } from '../helpers/find';
import { logAsset } from '../helpers/logs';
import { normalizePaths, relativePaths } from '../helpers/normalizePaths';
import { CliLogger } from '../logger';
import { findConfig, loadOptionsForCommand } from '../options/loadOptions';

export interface ProcessOptions extends GlobalOptions {
    readonly path: string | string[];
    readonly 'dry-run': boolean;
    readonly force: boolean;
    readonly 'pass-with-no-files': boolean;
    readonly 'asset-error-behavior': Result<ErrorBehavior, string>;
}

export const processCmd = new Command<ProcessOptions>({
    name: 'process',
    description: 'Processing source and sourcemap files',
})
    .option({
        name: 'path',
        description: 'Path to source files or directories containing sourcemaps to process.',
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
        name: 'asset-error-behavior',
        alias: 'e',
        type: GetErrorBehavior,
        typeLabel: 'string',
        description: `What to do when an asset fails. Can be one of: ${Object.keys(ErrorBehaviors).join(', ')}.`,
    })
    .option({
        name: 'pass-with-no-files',
        type: Boolean,
        description: 'Exits with zero exit code if no files for processing are found.',
    })
    .execute((context) => AsyncResult.equip(processSources(context)).then(map(output(context.logger))).inner);

/**
 * Processes source files found in path(s).
 */
export async function processSources({ opts, logger, getHelpMessage }: CommandContext<ProcessOptions>) {
    const sourceProcessor = new SourceProcessor(new DebugIdGenerator());
    const configPath = opts.config ?? (await findConfig());
    const configResult = await loadOptionsForCommand(configPath)('process');
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

    const logDebug = log(logger, 'debug');
    const logTrace = log(logger, 'trace');
    const logDebugAsset = logAsset(logger, 'debug');
    const logTraceAsset = logAsset(logger, 'trace');

    if (opts['asset-error-behavior']?.isErr()) {
        logger.info(getHelpMessage());
        return opts['asset-error-behavior'];
    }

    const assetErrorBehavior = (opts['asset-error-behavior']?.data as ErrorBehavior) ?? 'exit';
    const handleFailedAsset = handleError(assetErrorBehavior);

    const logAssetBehaviorError = (asset: Asset) => (err: string, level: LogLevel) =>
        logAsset(logger, level)(err)(asset);

    const logProcessResultBehaviorError = (err: ProcessAssetError, level: LogLevel) =>
        logAsset(logger, level)(err.error)(err.asset);

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
            .thenErr(handleFailedAsset<{ asset: Asset; result: boolean }>(logAssetBehaviorError(asset)))
            .thenErr((error) => `${asset.name}: ${error}`).inner;

    const filterUnprocessedAssetsCommand = (assets: Asset[]) =>
        AsyncResult.fromValue<Asset[], string>(assets)
            .then(map(isAssetProcessedCommand))
            .then(filterFailedElements)
            .then(filter((f) => !f.result))
            .then(map((f) => f.asset)).inner;

    const processCommand = (asset: Asset) =>
        AsyncResult.fromValue<Asset, ProcessAssetError>(asset)
            .then(logTraceAsset('processing file'))
            .then(processAsset(sourceProcessor))
            .then(logDebugAsset('file processed'))
            .thenErr(handleFailedAsset<ProcessAssetResult, ProcessAssetError>(logProcessResultBehaviorError))
            .thenErr(({ asset, error }) => `${asset.name}: ${error}`).inner;

    const writeCommand = (result: ProcessAssetResult) =>
        AsyncResult.fromValue<ProcessAssetResult, ProcessAssetError>(result)
            .then(logTraceAsset('writing file'))
            .then(writeAsset)
            .then(logDebugAsset('file written'))
            .thenErr(handleFailedAsset<ProcessAssetResult, ProcessAssetError>(logProcessResultBehaviorError))
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
        .then(filterFailedElements)
        .then(opts['dry-run'] ? Ok : map(writeCommand))
        .then(filterFailedElements).inner;
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
