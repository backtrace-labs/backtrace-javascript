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
    R,
    RawSourceMap,
    ResultPromise,
    SourceProcessor,
} from '@backtrace/sourcemap-tools';
import path from 'path';
import { GlobalOptions } from '..';
import { Command, CommandContext } from '../commands/Command';
import { readSourceMapFromPathOrFromSource, toAsset, writeAsset } from '../helpers/common';
import { ErrorBehaviors, filterBehaviorSkippedElements, getErrorBehavior, handleError } from '../helpers/errorBehavior';
import { buildIncludeExclude, file2Or1FromTuple, findTuples } from '../helpers/find';
import { logAsset } from '../helpers/logs';
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

    const addSourcesCommand = (asset: Asset) =>
        pipe(
            asset,
            logTraceAsset('reading sourcemap'),
            readSourceMapFromPathOrFromSource(sourceProcessor),
            R.map(logDebugAsset('read sourcemap')),
            R.map(logTraceAsset('adding source')),
            R.map(addSourceToSourceMap(opts.force ?? false)),
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

    const hasSources = (asset: AssetWithContent<RawSourceMap>): asset is AssetWithContent<RawSourceMap> =>
        sourceProcessor.doesSourceMapHaveSources(asset.content);

    return async function addSourceToSourceMap(
        asset: AssetWithContent<RawSourceMap>,
    ): ResultPromise<AssetWithContent<RawSourceMap>, string> {
        return !hasSources(asset) || force
            ? pipe(
                  asset,
                  (asset) => sourceProcessor.addSourcesToSourceMap(asset.content, asset.path),
                  R.map((content) => ({ ...asset, content } as AssetWithContent<RawSourceMap>)),
              )
            : Ok(asset);
    };
}

function output(logger: CliLogger) {
    return function output(asset: AssetWithContent<RawSourceMap>) {
        logger.output(asset.path);
        return asset;
    };
}
