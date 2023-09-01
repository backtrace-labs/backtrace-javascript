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
    matchSourceExtension,
} from '@backtrace-labs/sourcemap-tools';
import path from 'path';
import { GlobalOptions } from '..';
import { Command } from '../commands/Command';
import { toAsset } from '../helpers/common';
import { find } from '../helpers/find';
import { logAsset } from '../helpers/logs';
import { normalizePaths, relativePaths } from '../helpers/normalizePaths';
import { CliLogger } from '../logger';
import { findConfig, loadOptions } from '../options/loadOptions';
import { CliOptions, CommandCliOptions } from '../options/models/CliOptions';
import { addSourcesToSourcemaps } from './add-sources';
import { processSources } from './process';
import { uploadSourcemaps } from './upload';

export interface RunOptions extends GlobalOptions {
    readonly 'add-sources': boolean;
    readonly upload: boolean;
    readonly process: boolean;
    readonly path: string | string[];
    readonly force: boolean;
    readonly 'pass-with-no-files': boolean;
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
        name: 'force',
        alias: 'f',
        type: Boolean,
        description: 'Forces execution of commands.',
    })
    .option({
        name: 'pass-with-no-files',
        type: Boolean,
        description: 'Exits with zero exit code if no sourcemaps are found.',
    })
    .execute(async function ({ opts, logger, getHelpMessage }) {
        const configPath = opts.config ?? (await findConfig());
        if (!configPath) {
            return Err('cannot find config file');
        }

        logger.debug(`reading config from ${configPath}`);

        const configResult = await loadOptions(configPath);
        if (configResult.isErr()) {
            return configResult;
        }

        const config = configResult.data;
        if (!config) {
            logger.info(getHelpMessage());
            return Err('cannot read config file');
        }

        opts = {
            ...opts,
            path: opts.path ?? (config.path ? relativePaths(config.path, path.dirname(configPath)) : process.cwd()),
        };

        logger.trace(`resolved options: \n${JSON.stringify(opts, null, '  ')}`);

        const runProcess = shouldRunCommand(opts, config, 'process');
        const runAddSources = shouldRunCommand(opts, config, 'add-sources');
        const runUpload = shouldRunCommand(opts, config, 'upload');
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
        const sourceProcessor = new SourceProcessor(new DebugIdGenerator());

        const getSourceMapPathCommand = (asset: Asset) =>
            AsyncResult.fromValue<Asset, string>(asset)
                .then(logTraceAsset('reading sourcemap path'))
                .then(getSourceMapPath(sourceProcessor))
                .then<AssetWithSourceMapPath>((sourceMapPath) => ({ ...asset, sourceMapPath }))
                .then(logTraceAsset('read sourcemap path')).inner;

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

        return AsyncResult.equip(find(...searchPaths))
            .then(logTrace((r) => `found ${r.length} files`))
            .then(map(logTrace((result) => `found file: ${result.path}`)))
            .then(filter((t) => t.direct || matchSourceExtension(t.path)))
            .then(map((t) => t.path))
            .then(logDebug((r) => `found ${r.length} source files`))
            .then(map(logTrace((path) => `found source file: ${path}`)))
            .then(opts['pass-with-no-files'] ? Ok : failIfEmpty('no source files found'))
            .then(map(toAsset))
            .then(map(getSourceMapPathCommand))
            .then(map(printAssetInfo(logger)))
            .then(runProcess ? processCommand : Ok)
            .then(runAddSources ? addSourcesCommand : Ok)
            .then(runUpload ? uploadCommand : Ok).inner;
    });

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

function shouldRunCommand(opts: Partial<RunOptions>, config: CliOptions, key: keyof CommandCliOptions) {
    if (opts[key]) {
        return true;
    }

    if (!config?.run) {
        return false;
    }

    if (Array.isArray(config.run)) {
        return config.run.includes(key);
    }

    return !!config.run[key];
}