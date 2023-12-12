import {
    AddSourcesResult,
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
    R,
    RawSourceMap,
    Result,
    ResultPromise,
    SourceProcessor,
} from '@backtrace/sourcemap-tools';
import path from 'path';
import { GlobalOptions } from '..';
import { Command, CommandContext } from '../commands/Command';
import { readSourceMapFromPathOrFromSource, toAsset, writeAsset } from '../helpers/common';
import {
    ErrorBehavior,
    ErrorBehaviors,
    filterBehaviorSkippedElements,
    getErrorBehavior,
    handleError,
    isFatal,
    shouldLog,
} from '../helpers/errorBehavior';
import { buildIncludeExclude, file2Or1FromTuple, findTuples } from '../helpers/find';
import { createAssetLogger } from '../helpers/logs';
import { normalizePaths, relativePaths } from '../helpers/normalizePaths';
import { CliLogger } from '../logger';
import { findConfig, loadOptionsForCommand } from '../options/loadOptions';

export interface AddSourcesOptions extends GlobalOptions {
    readonly path: string | string[];
    readonly include: string | string[];
    readonly exclude: string | string[];
    readonly 'dry-run': boolean;
    readonly force: boolean;
    readonly skipFailing: boolean;
    readonly 'pass-with-no-files': boolean;
    readonly 'asset-error-behavior': string;
    readonly 'source-error-behavior': string;
}

interface AssetAddSourcesResult extends AssetWithContent<RawSourceMap> {
    readonly result: AddSourcesResult;
}

export const addSourcesCmd = new Command<AddSourcesOptions>({
    name: 'add-sources',
    description: 'Adds sources to sourcemap files',
})
    .option({
        name: 'path',
        description: 'Path to sourcemap files to append sources to.',
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
        description: 'Processes files even if sourcesContent is not empty. Will overwrite existing sources.',
    })
    .option({
        name: 'asset-error-behavior',
        alias: 'e',
        type: String,
        description: `What to do when an asset fails. Can be one of: ${Object.keys(ErrorBehaviors).join(', ')}.`,
    })
    .option({
        name: 'source-error-behavior',
        type: String,
        description: `What to do when reading sourcepath fails. Can be one of: ${Object.keys(ErrorBehaviors).join(
            ', ',
        )}.`,
    })
    .option({
        name: 'pass-with-no-files',
        type: Boolean,
        description: 'Exits with zero exit code if no sourcemaps are found.',
    })
    .execute(addSourcesToSourcemaps);

/**
 * Adds sources to sourcemaps found in path(s).
 */
export async function addSourcesToSourcemaps({ opts, logger, getHelpMessage }: CommandContext<AddSourcesOptions>) {
    const sourceProcessor = new SourceProcessor(new DebugIdGenerator());
    const configPath = opts.config ?? (await findConfig());
    const configResult = await loadOptionsForCommand(configPath)('add-sources');
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
    if (!searchPaths.length) {
        logger.info(getHelpMessage());
        return Err('path must be specified');
    }

    const logDebug = log(logger, 'debug');
    const logTrace = log(logger, 'trace');
    const logAsset = createAssetLogger(logger);
    const logDebugAsset = logAsset('debug');
    const logTraceAsset = logAsset('trace');

    const assetErrorBehaviorResult = getErrorBehavior(opts['asset-error-behavior'] ?? 'exit');
    if (assetErrorBehaviorResult.isErr()) {
        logger.info(getHelpMessage());
        return assetErrorBehaviorResult;
    }

    const assetErrorBehavior = assetErrorBehaviorResult.data;

    const sourceErrorBehaviorResult = getErrorBehavior(opts['source-error-behavior'] ?? 'warn');
    if (sourceErrorBehaviorResult.isErr()) {
        logger.info(getHelpMessage());
        return sourceErrorBehaviorResult;
    }

    const sourceErrorBehavior = sourceErrorBehaviorResult.data;

    const handleFailedAsset = handleError(assetErrorBehavior);

    const logAssetBehaviorError = (asset: Asset) => (err: string, level: LogLevel) =>
        createAssetLogger(logger, level)(err)(asset);

    const processAssetResult =
        (behavior: ErrorBehavior) =>
        (result: AssetAddSourcesResult): Result<AssetAddSourcesResult, string> => {
            const { succeeded, skipped, failed } = result.result;
            if (failed.length) {
                if (isFatal(behavior)) {
                    return Err(
                        `failed to find source for ${failed[0]}` +
                            (failed.length > 1 ? ` (and ${failed.length} more)` : ''),
                    );
                } else if (shouldLog(behavior)) {
                    for (const path of failed) {
                        logAsset(behavior)(`failed to find source for ${path}`)(result);
                    }
                }
            }

            for (const path of skipped) {
                logDebugAsset(`skipped source for ${path}`)(result);
            }

            for (const path of succeeded) {
                logTraceAsset(`added source for ${path}`)(result);
            }

            return Ok(result);
        };

    const addSourcesCommand = (asset: Asset) =>
        pipe(
            asset,
            logTraceAsset('reading sourcemap'),
            readSourceMapFromPathOrFromSource(sourceProcessor),
            R.map(logDebugAsset('read sourcemap')),
            R.map(logTraceAsset('adding source')),
            R.map(addSourceToSourceMap(opts.force ?? false)),
            R.map(processAssetResult(sourceErrorBehavior)),
            R.map(logDebugAsset('source added')),
            R.map(
                opts['dry-run']
                    ? Ok
                    : flow(
                          logTraceAsset('writing source and sourcemap'),
                          writeAsset,
                          R.map(logDebugAsset('wrote source and sourcemap')),
                      ),
            ),
            R.mapErr((error) => `${asset.name}: ${error}`),
            handleFailedAsset(logAssetBehaviorError(asset)),
        );

    const includePaths = normalizePaths(opts.include);
    const excludePaths = normalizePaths(opts.exclude);
    const { isIncluded, isExcluded } = await buildIncludeExclude(includePaths, excludePaths, logTrace);

    return pipe(
        searchPaths,
        findTuples,
        R.map(
            flow(
                map(file2Or1FromTuple),
                logDebug((r) => `found ${r.length} files`),
                map(logTrace((result) => `found file: ${result.path}`)),
                isIncluded ? filterAsync(isIncluded) : pass,
                isExcluded ? filterAsync(flow(isExcluded, not)) : pass,
                filter((t) => t.direct || matchSourceMapExtension(t.path)),
                map((t) => t.path),
                logDebug((r) => `found ${r.length} files for adding sources`),
                map(logTrace((path) => `file to add sources to: ${path}`)),
                map(toAsset),
                opts['pass-with-no-files'] ? Ok : failIfEmpty('no sourcemaps found'),
                R.map(flow(mapAsync(addSourcesCommand), R.flatMap)),
                R.map(filterBehaviorSkippedElements),
                R.map(map(output(logger))),
            ),
        ),
    );
}

export function addSourceToSourceMap(force: boolean) {
    const sourceProcessor = new SourceProcessor(new DebugIdGenerator());

    return async function addSourceToSourceMap(
        asset: AssetWithContent<RawSourceMap>,
    ): ResultPromise<AssetAddSourcesResult, string> {
        return pipe(
            asset,
            (asset) => sourceProcessor.addSourcesToSourceMap(asset.content, asset.path, force),
            R.map((result) => ({ ...asset, content: result.sourceMap, result })),
        );
    };
}

function output(logger: CliLogger) {
    return function output(asset: AssetWithContent<RawSourceMap>) {
        logger.output(asset.path);
        return asset;
    };
}
