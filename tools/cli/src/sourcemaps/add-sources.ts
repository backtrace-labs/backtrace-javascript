import {
    Asset,
    AssetWithContent,
    AsyncResult,
    DebugIdGenerator,
    Err,
    failIfEmpty,
    filter,
    log,
    map,
    matchSourceMapExtension,
    Ok,
    RawSourceMap,
    SourceProcessor,
    writeFile,
} from '@backtrace-labs/sourcemap-tools';
import path from 'path';
import { GlobalOptions } from '..';
import { Command, CommandContext } from '../commands/Command';
import { loadSourceMapFromPathOrFromSource, toAsset } from '../helpers/common';
import { find } from '../helpers/find';
import { logAsset } from '../helpers/logs';
import { normalizePaths, relativePaths } from '../helpers/normalizePaths';
import { CliLogger } from '../logger';
import { findConfig, loadOptionsForCommand } from '../options/loadOptions';

export interface AddSourcesOptions extends GlobalOptions {
    readonly path: string | string[];
    readonly 'dry-run': boolean;
    readonly force: boolean;
    readonly skipFailing: boolean;
    readonly 'pass-with-no-files': boolean;
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
        name: 'pass-with-no-files',
        type: Boolean,
        description: 'Exits with zero exit code if no sourcemaps are found.',
    })
    .execute((context) => AsyncResult.equip(addSourcesToSourcemaps(context)).then(map(output(context.logger))).inner);

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

    const loadSourceMapCommand = (asset: Asset) =>
        AsyncResult.fromValue<Asset, string>(asset)
            .then(logTraceAsset('loading sourcemap'))
            .then(loadSourceMapFromPathOrFromSource(sourceProcessor))
            .then(logDebugAsset('loaded sourcemap')).inner;

    const doesSourceMapHaveSourcesCommand = (asset: AssetWithContent<RawSourceMap>) =>
        AsyncResult.fromValue<AssetWithContent<RawSourceMap>, string>(asset)
            .then(logTraceAsset('checking if sourcemap has sources'))
            .then(doesSourceMapHaveSources(sourceProcessor))
            .then(
                logDebug(
                    ({ asset, result }) =>
                        `${asset.name}: ` + (result ? 'sourcemap has sources' : 'sourcemap does not have sources'),
                ),
            )
            .thenErr((error) => `${asset.name}: ${error}`).inner;

    const filterAssetsCommand = (assets: AssetWithContent<RawSourceMap>[]) =>
        AsyncResult.fromValue<AssetWithContent<RawSourceMap>[], string>(assets)
            .then(map(doesSourceMapHaveSourcesCommand))
            .then(filter((f) => !f.result))
            .then(map((f) => f.asset)).inner;

    const addSourceCommand = (asset: AssetWithContent<RawSourceMap>) =>
        AsyncResult.fromValue<AssetWithContent<RawSourceMap>, string>(asset)
            .then(logTraceAsset('adding source'))
            .then(addSource(sourceProcessor))
            .then(logDebugAsset('source added'))
            .thenErr((error) => `${asset.name}: ${error}`).inner;

    const writeSourceMapCommand = (asset: AssetWithContent<RawSourceMap>) =>
        AsyncResult.fromValue<AssetWithContent<RawSourceMap>, string>(asset)
            .then(logTraceAsset('writing sourcemap'))
            .then(writeSourceMap)
            .then(logDebugAsset('sourcemap written'))
            .thenErr((error) => `${asset.name}: ${error}`).inner;

    return AsyncResult.equip(find(...searchPaths))
        .then(logDebug((r) => `found ${r.length} files`))
        .then(map(logTrace((result) => `found file: ${result.path}`)))
        .then(filter((t) => t.direct || matchSourceMapExtension(t.path)))
        .then(map((t) => t.path))
        .then(logDebug((r) => `found ${r.length} files for adding sources`))
        .then(map(logTrace((path) => `file to add sources to: ${path}`)))
        .then(opts['pass-with-no-files'] ? Ok : failIfEmpty('no sourcemaps found'))
        .then(map(toAsset))
        .then(map(loadSourceMapCommand))
        .then(opts.force ? Ok : filterAssetsCommand)
        .then(logDebug((r) => `adding sources to ${r.length} files`))
        .then(map(logTrace(({ path }) => `file to add sources to: ${path}`)))
        .then(
            opts['pass-with-no-files']
                ? Ok
                : failIfEmpty('no sourcemaps without sources found, use --force to overwrite sources'),
        )
        .then(map(addSourceCommand))
        .then(opts['dry-run'] ? Ok : map(writeSourceMapCommand)).inner;
}

function doesSourceMapHaveSources(sourceProcessor: SourceProcessor) {
    return function doesSourceMapHaveSources(asset: AssetWithContent<RawSourceMap>) {
        return {
            asset,
            result: sourceProcessor.doesSourceMapHaveSources(asset.content),
        };
    };
}

function addSource(sourceProcessor: SourceProcessor) {
    return function addSource(asset: AssetWithContent<RawSourceMap>) {
        return AsyncResult.equip(sourceProcessor.addSourcesToSourceMap(asset.content, asset.path)).then<
            AssetWithContent<RawSourceMap>
        >((newSourceMap) => ({ ...asset, sourceMap: newSourceMap })).inner;
    };
}

function writeSourceMap(asset: AssetWithContent<RawSourceMap>) {
    const { content, path } = asset;
    return AsyncResult.equip(writeFile([JSON.stringify(content), path])).then(() => asset).inner;
}

function output(logger: CliLogger) {
    return function output(asset: AssetWithContent<RawSourceMap>) {
        logger.output(asset.path);
        return asset;
    };
}
