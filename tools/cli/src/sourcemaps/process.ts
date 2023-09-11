import {
    Asset,
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
    matchSourceExtension,
    not,
    Ok,
    pass,
    pipe,
    ProcessedSourceAndSourceMap,
    R,
    SourceAndSourceMap,
    SourceProcessor,
} from '@backtrace-labs/sourcemap-tools';
import path from 'path';
import { GlobalOptions } from '..';
import { Command, CommandContext } from '../commands/Command';
import { readSourceAndSourceMap, toAsset, writeSourceAndSourceMap } from '../helpers/common';
import { ErrorBehaviors, filterBehaviorSkippedElements, getErrorBehavior, handleError } from '../helpers/errorBehavior';
import { buildIncludeExclude, find } from '../helpers/find';
import { logAsset, logAssets } from '../helpers/logs';
import { normalizePaths, relativePaths } from '../helpers/normalizePaths';
import { CliLogger } from '../logger';
import { findConfig, loadOptionsForCommand } from '../options/loadOptions';

export interface ProcessOptions extends GlobalOptions {
    readonly path: string | string[];
    readonly include: string | string[];
    readonly exclude: string | string[];
    readonly 'dry-run': boolean;
    readonly force: boolean;
    readonly 'pass-with-no-files': boolean;
    readonly 'asset-error-behavior': string;
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
        type: String,
        description: `What to do when an asset fails. Can be one of: ${Object.keys(ErrorBehaviors).join(', ')}.`,
    })
    .option({
        name: 'pass-with-no-files',
        type: Boolean,
        description: 'Exits with zero exit code if no files for processing are found.',
    })
    .execute(processSources);

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
    const logTraceAsset = logAsset(logger, 'trace');
    const logDebugAssets = logAssets(logger, 'debug');
    const logTraceAssets = logAssets(logger, 'trace');

    const assetErrorBehaviorResult = getErrorBehavior(opts['asset-error-behavior'] ?? 'exit');
    if (assetErrorBehaviorResult.isErr()) {
        logger.info(getHelpMessage());
        return assetErrorBehaviorResult;
    }

    const assetErrorBehavior = assetErrorBehaviorResult.data;
    const handleFailedAsset = handleError(assetErrorBehavior);

    const logAssetBehaviorError = (asset: Asset) => (err: string, level: LogLevel) =>
        logAsset(logger, level)(err)(asset);

    const processAssetCommand = (asset: Asset) =>
        pipe(
            asset,
            logTraceAsset('reading source and sourcemap'),
            readSourceAndSourceMap(sourceProcessor),
            R.map(logDebugAssets('read source and sourcemap')),
            R.map(logTraceAssets('processing source and sourcemap')),
            R.map(processSource(opts.force ?? false)),
            R.map(logDebugAssets('processed source and sourcemap')),
            R.map(
                opts['dry-run']
                    ? Ok
                    : flow(
                          logTraceAssets('writing source and sourcemap'),
                          writeSourceAndSourceMap,
                          R.map(logDebugAssets('wrote source and sourcemap')),
                      ),
            ),
            R.mapErr((err) => `${asset.name}: ${err}`),
            handleFailedAsset(logAssetBehaviorError(asset)),
        );

    const includePaths = normalizePaths(opts.include);
    const excludePaths = normalizePaths(opts.exclude);
    const { isIncluded, isExcluded } = await buildIncludeExclude(includePaths, excludePaths, logDebug);

    return pipe(
        searchPaths,
        find,
        logDebug((r) => `found ${r.length} files`),
        map(logTrace((result) => `found file: ${result.path}`)),
        isIncluded ? filterAsync(isIncluded) : pass,
        isExcluded ? filterAsync(flow(isExcluded, not)) : pass,
        filter((t) => t.direct || matchSourceExtension(t.path)),
        map((t) => t.path),
        logDebug((r) => `found ${r.length} files for processing`),
        map(logTrace((path) => `file for processing: ${path}`)),
        map(toAsset),
        opts['pass-with-no-files'] ? Ok : failIfEmpty('no source files found'),
        R.map(flow(mapAsync(processAssetCommand), R.flatMap)),
        R.map(filterBehaviorSkippedElements),
        R.map(map(output(logger))),
    );
}

export function processSource(force: boolean) {
    const sourceProcessor = new SourceProcessor(new DebugIdGenerator());

    const getDebugId = (sourceAndSourceMap: SourceAndSourceMap) =>
        sourceProcessor.getSourceMapDebugId(sourceAndSourceMap.sourceMap.content);

    return async function processSource(asset: SourceAndSourceMap): Promise<ProcessedSourceAndSourceMap> {
        return pipe(asset, getDebugId, (debugId) =>
            !debugId || force
                ? pipe(
                      asset,
                      (asset) =>
                          sourceProcessor.processSourceAndSourceMap(asset.source.content, asset.sourceMap.content),
                      (result) =>
                          ({
                              source: { ...asset.source, content: result.source },
                              sourceMap: { ...asset.sourceMap, content: result.sourceMap },
                              debugId: result.debugId,
                          } as ProcessedSourceAndSourceMap),
                  )
                : ({ ...asset, debugId } as ProcessedSourceAndSourceMap),
        );
    };
}

function output(logger: CliLogger) {
    return function output(result: ProcessedSourceAndSourceMap) {
        logger.output(result.source.path);
        return result;
    };
}
