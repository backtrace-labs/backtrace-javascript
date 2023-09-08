import {
    Asset,
    AsyncResult,
    DebugIdGenerator,
    Err,
    LogLevel,
    Ok,
    SourceProcessor,
    failIfEmpty,
    filter,
    flow,
    log,
    map,
    matchSourceExtension,
    not,
    pass,
} from '@backtrace-labs/sourcemap-tools';
import path from 'path';
import { GlobalOptions } from '..';
import { Command, CommandContext } from '../commands/Command';
import { toAsset } from '../helpers/common';
import { ErrorBehaviors, filterBehaviorSkippedElements, getErrorBehavior, handleError } from '../helpers/errorBehavior';
import { buildIncludeExclude, find } from '../helpers/find';
import { logAsset } from '../helpers/logs';
import { normalizePaths, relativePaths } from '../helpers/normalizePaths';
import { CliLogger } from '../logger';
import { findConfig, loadOptionsForCommand } from '../options/loadOptions';
import { addSourcesToSourcemaps } from './add-sources';
import { processSources } from './process';
import { uploadSourcemaps } from './upload';

export interface RunOptions extends GlobalOptions {
    readonly 'add-sources': boolean;
    readonly upload: boolean;
    readonly process: boolean;
    readonly path: string | string[];
    readonly include: string | string[];
    readonly exclude: string | string[];
    readonly force: boolean;
    readonly 'pass-with-no-files': boolean;
    readonly 'asset-error-behavior': string;
}

interface AssetWithSourceMapPath extends Asset {
    readonly sourceMapPath: string;
}

export const runCmd = new Command<RunOptions>({
    name: 'run',
    description: 'Runs all of the source commands in one go.',
})
    .option({
        name: 'process',
        type: Boolean,
        description: 'Processes found sources.',
    })
    .option({
        name: 'add-sources',
        type: Boolean,
        description: 'Adds sources to found sourcemaps.',
    })
    .option({
        name: 'upload',
        type: Boolean,
        description: 'Uploads found sourcemaps to Backtrace.',
    })
    .option({
        name: 'path',
        type: String,
        defaultOption: true,
        description: 'Path to sources.',
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
        name: 'force',
        alias: 'f',
        type: Boolean,
        description: 'Forces execution of commands.',
    })
    .option({
        name: 'asset-error-behavior',
        alias: 'e',
        type: String,
        description: `What to do when an asset fails. Can be one of: ${Object.keys(ErrorBehaviors).join(', ')}.`,
    })
    .option({
        name: 'pass-with-no-files',
        type: Boolean,
        description: 'Exits with zero exit code if no sourcemaps are found.',
    })
    .execute(runSourcemapCommands);

export async function runSourcemapCommands({ opts, logger, getHelpMessage }: CommandContext<RunOptions>) {
    const sourceProcessor = new SourceProcessor(new DebugIdGenerator());
    const configPath = opts.config ?? (await findConfig());
    if (!configPath) {
        return Err('cannot find config file');
    }

    logger.debug(`reading config from ${configPath}`);

    const configResult = await loadOptionsForCommand(configPath)('run');
    if (configResult.isErr()) {
        return configResult;
    }

    const config = configResult.data;
    if (!config) {
        logger.info(getHelpMessage());
        return Err('cannot read config file');
    }

    opts = {
        ...config,
        ...opts,
        path: opts.path ?? (config.path ? relativePaths(config.path, path.dirname(configPath)) : process.cwd()),
    };

    logger.trace(`resolved options: \n${JSON.stringify(opts, null, '  ')}`);

    const runProcess = opts.process;
    const runAddSources = opts['add-sources'];
    const runUpload = opts.upload;
    if (!runAddSources && !runUpload && !runProcess) {
        logger.info(getHelpMessage());
        return Err('--process, --add-sources and/or --upload must be specified');
    }

    const searchPaths = normalizePaths(opts.path, process.cwd());
    if (!searchPaths.length) {
        logger.info(getHelpMessage());
        return Err('path must be specified');
    }

    const logInfo = log(logger, 'info');
    const logDebug = log(logger, 'debug');
    const logTrace = log(logger, 'trace');
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

    const getSourceMapPathCommand = (asset: Asset) =>
        AsyncResult.fromValue<Asset, string>(asset)
            .then(logTraceAsset('reading sourcemap path'))
            .then(getSourceMapPath(sourceProcessor))
            .then<AssetWithSourceMapPath>((sourceMapPath) => ({ ...asset, sourceMapPath }))
            .then(logTraceAsset('read sourcemap path'))
            .thenErr(handleFailedAsset<AssetWithSourceMapPath>(logAssetBehaviorError(asset))).inner;

    const processCommand = (assets: AssetWithSourceMapPath[]) =>
        AsyncResult.fromValue<AssetWithSourceMapPath[], string>(assets)
            .then(logDebug(`running process...`))
            .then((assets) =>
                assets.length
                    ? processSources({
                          opts: { ...opts, 'pass-with-no-files': true, path: assets.map((a) => a.path) },
                          getHelpMessage,
                          logger: logger.clone({ prefix: 'process:' }),
                      })
                    : Ok([]),
            )
            .then(logInfo((results) => `processed ${results.length} files`))
            .then(() => assets).inner;

    const addSourcesCommand = (assets: AssetWithSourceMapPath[]) =>
        AsyncResult.fromValue<AssetWithSourceMapPath[], string>(assets)
            .then(logDebug(`running add-sources...`))
            .then((assets) =>
                assets.length
                    ? addSourcesToSourcemaps({
                          opts: { ...opts, 'pass-with-no-files': true, path: assets.map((a) => a.sourceMapPath) },
                          getHelpMessage,
                          logger: logger.clone({ prefix: 'add-sources:' }),
                      })
                    : Ok([]),
            )
            .then(logInfo((results) => `added sources to ${results.length} files`))
            .then(() => assets).inner;

    const uploadCommand = (assets: AssetWithSourceMapPath[]) =>
        AsyncResult.fromValue<AssetWithSourceMapPath[], string>(assets)
            .then(logDebug(`running upload...`))
            .then((assets) =>
                assets.length
                    ? uploadSourcemaps({
                          opts: { ...opts, path: assets.map((a) => a.sourceMapPath) },
                          getHelpMessage,
                          logger: logger.clone({ prefix: 'upload:' }),
                      })
                    : Ok(null),
            )
            .then(
                logInfo((result) =>
                    result ? `uploaded ${result.assets.length} files: ${result.rxid}` : `no files uploaded`,
                ),
            )
            .then(() => assets).inner;

    const includePaths = normalizePaths(opts.include);
    const excludePaths = normalizePaths(opts.exclude);
    const { isIncluded, isExcluded } = await buildIncludeExclude(includePaths, excludePaths, logDebug);

    return AsyncResult.fromValue<string[], string>(searchPaths)
        .then(find)
        .then(logTrace((r) => `found ${r.length} files`))
        .then(map(logTrace((result) => `found file: ${result.path}`)))
        .then(isIncluded ? filter(isIncluded) : pass)
        .then(isExcluded ? filter(flow(isExcluded, not)) : pass)
        .then(filter((t) => t.direct || matchSourceExtension(t.path)))
        .then(map((t) => t.path))
        .then(logDebug((r) => `found ${r.length} source files`))
        .then(map(logTrace((path) => `found source file: ${path}`)))
        .then(opts['pass-with-no-files'] ? Ok : failIfEmpty('no source files found'))
        .then(map(toAsset))
        .then(map(getSourceMapPathCommand))
        .then(filterBehaviorSkippedElements)
        .then(map(printAssetInfo(logger)))
        .then(runProcess ? processCommand : Ok)
        .then(runAddSources ? addSourcesCommand : Ok)
        .then(runUpload ? uploadCommand : Ok).inner;
}

function getSourceMapPath(sourceProcessor: SourceProcessor) {
    return function getSourceMapPath(asset: Asset) {
        return sourceProcessor.getSourceMapPathFromSourceFile(asset.path);
    };
}

function printAssetInfo(logger: CliLogger) {
    return function printAssetInfo(asset: AssetWithSourceMapPath) {
        logger.debug(`${asset.path}`);
        logger.debug(`└── ${asset.sourceMapPath}`);
        return asset;
    };
}
