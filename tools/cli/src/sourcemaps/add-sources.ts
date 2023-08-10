import {
    Asset,
    AsyncResult,
    DebugIdGenerator,
    Err,
    Ok,
    SourceProcessor,
    failIfEmpty,
    filter,
    log,
    map,
    matchSourceMapExtension,
    parseJSON,
    readFile,
    writeFile,
} from '@backtrace/sourcemap-tools';
import { GlobalOptions } from '..';
import { Command } from '../commands/Command';
import { find } from '../helpers/find';
import { logAsset } from '../helpers/logs';
import { CliLogger, createLogger } from '../logger';

interface AddSourcesOptions extends GlobalOptions {
    readonly path: string[];
    readonly 'dry-run': boolean;
    readonly force: boolean;
    readonly skipFailing: boolean;
    readonly 'pass-with-no-files': boolean;
}

interface AssetWithContent extends Asset {
    readonly content: string;
}

interface AssetWithSourceMap extends Asset {
    readonly sourceMap: object;
}

export const addSourcesCmd = new Command<AddSourcesOptions>({
    name: 'add-sources',
    description: 'Adds sources to sourcemap files',
})
    .option({
        name: 'path',
        description: 'Path to sourcemap files to append sources to.',
        defaultOption: true,
        defaultValue: process.cwd(),
        multiple: true,
        alias: 'p',
    })
    .option({
        name: 'dry-run',
        alias: 'n',
        type: Boolean,
        description: 'Does not modify the files at the end.',
        defaultValue: false,
    })
    .option({
        name: 'force',
        alias: 'f',
        type: Boolean,
        description: 'Processes files even if sourcesContent is not empty. Will overwrite existing sources.',
        defaultValue: false,
    })
    .option({
        name: 'pass-with-no-files',
        type: Boolean,
        description: 'Exits with zero exit code if no sourcemaps are found.',
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

        const logDebug = log(logger, 'debug');
        const logTrace = log(logger, 'trace');
        const logDebugAsset = logAsset(logger, 'debug');
        const logTraceAsset = logAsset(logger, 'trace');

        const readAssetCommand = (asset: Asset) =>
            AsyncResult.fromValue<Asset, string>(asset)
                .then((asset) => readFile(asset.path))
                .then<AssetWithContent>((content) => ({ ...asset, content }))
                .thenErr((error) => `${asset.name}: ${error}`).inner;

        const loadAssetCommand = (asset: AssetWithContent) =>
            AsyncResult.fromValue<AssetWithContent, string>(asset)
                .then(({ content }) => parseJSON<object>(content))
                .then<AssetWithSourceMap>((sourceMap) => ({ ...asset, sourceMap }))
                .thenErr((error) => `${asset.name}: ${error}`).inner;

        const doesSourceMapHaveSourcesCommand = (asset: AssetWithSourceMap) =>
            AsyncResult.fromValue<AssetWithSourceMap, string>(asset)
                .then(logTraceAsset('checking if sourcemap has sources'))
                .then(doesSourceMapHaveSources(sourceProcessor))
                .then(
                    logDebug(
                        ({ asset, result }) =>
                            `${asset.name}: ` + (result ? 'sourcemap has sources' : 'sourcemap does not have sources'),
                    ),
                )
                .thenErr((error) => `${asset.name}: ${error}`).inner;

        const filterAssetsCommand = (assets: AssetWithSourceMap[]) =>
            AsyncResult.fromValue<AssetWithSourceMap[], string>(assets)
                .then(map(doesSourceMapHaveSourcesCommand))
                .then(filter((f) => !f.result))
                .then(map((f) => f.asset)).inner;

        const addSourceCommand = (asset: AssetWithSourceMap) =>
            AsyncResult.fromValue<AssetWithSourceMap, string>(asset)
                .then(logTraceAsset('adding source'))
                .then(addSource(sourceProcessor))
                .then(logDebugAsset('source added'))
                .thenErr((error) => `${asset.name}: ${error}`).inner;

        const writeSourceMapCommand = (asset: AssetWithSourceMap) =>
            AsyncResult.fromValue<AssetWithSourceMap, string>(asset)
                .then(logTraceAsset('writing sourcemap'))
                .then(writeSourceMap)
                .then(logDebugAsset('sourcemap written'))
                .thenErr((error) => `${asset.name}: ${error}`).inner;

        return AsyncResult.equip(find(...searchPaths))
            .then(logDebug((r) => `found ${r.length} files`))
            .then(map(logTrace((path) => `found file: ${path}`)))
            .then(filter(matchSourceMapExtension))
            .then(logDebug((r) => `found ${r.length} files matching sourcemap extension`))
            .then(map(logTrace((path) => `file matching extension: ${path}`)))
            .then(opts['pass-with-no-files'] ? Ok : failIfEmpty('no sourcemaps found'))
            .then(map(toAsset))
            .then(map(readAssetCommand))
            .then(map(loadAssetCommand))
            .then(opts.force ? Ok : filterAssetsCommand)
            .then(logDebug((r) => `adding sources to ${r.length} files`))
            .then(map(logTrace(({ path }) => `file to add sources to: ${path}`)))
            .then(
                opts['pass-with-no-files']
                    ? Ok
                    : failIfEmpty('no sourcemaps without sources found, use --force to overwrite sources'),
            )
            .then(map(addSourceCommand))
            .then(opts['dry-run'] ? Ok : map(writeSourceMapCommand))
            .then(map(output(logger)))
            .then(() => 0).inner;
    });

function toAsset(file: string): Asset {
    return { name: file, path: file };
}

function doesSourceMapHaveSources(sourceProcessor: SourceProcessor) {
    return function doesSourceMapHaveSources(asset: AssetWithSourceMap) {
        return {
            asset,
            result: sourceProcessor.doesSourceMapHaveSources(asset.sourceMap as never),
        };
    };
}

function addSource(sourceProcessor: SourceProcessor) {
    return function addSource(asset: AssetWithSourceMap) {
        return AsyncResult.equip(
            sourceProcessor.addSourcesToSourceMap(asset.sourceMap as never, asset.path),
        ).then<AssetWithSourceMap>((newSourceMap) => ({ ...asset, sourceMap: newSourceMap })).inner;
    };
}

function writeSourceMap(asset: AssetWithSourceMap) {
    const { sourceMap, path } = asset;
    return AsyncResult.equip(writeFile([JSON.stringify(sourceMap), path])).then(() => asset).inner;
}

function output(logger: CliLogger) {
    return function output(asset: AssetWithSourceMap) {
        logger.output(asset.path);
        return asset;
    };
}
