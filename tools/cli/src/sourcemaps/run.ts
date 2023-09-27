import {
    Asset,
    AssetWithContent,
    DebugIdGenerator,
    Err,
    LogLevel,
    Ok,
    R,
    RawSourceMap,
    RawSourceMapWithDebugId,
    SourceAndSourceMap,
    SourceProcessor,
    UploadResult,
    failIfEmpty,
    filter,
    filterAsync,
    flow,
    log,
    map,
    mapAsync,
    matchSourceExtension,
    not,
    pass,
    pipe,
} from '@backtrace-labs/sourcemap-tools';
import path from 'path';
import { GlobalOptions } from '..';
import { Command, CommandContext } from '../commands/Command';
import {
    isAssetProcessed,
    readSourceAndSourceMap,
    toAsset,
    uniqueBy,
    writeSourceAndSourceMap,
} from '../helpers/common';
import { ErrorBehaviors, filterBehaviorSkippedElements, getErrorBehavior, handleError } from '../helpers/errorBehavior';
import { buildIncludeExclude, find } from '../helpers/find';
import { logAsset, logAssets } from '../helpers/logs';
import { normalizePaths, relativePaths } from '../helpers/normalizePaths';
import { CliLogger } from '../logger';
import { findConfig, joinOptions, loadOptions } from '../options/loadOptions';
import { addSourceToSourceMap } from './add-sources';
import { processSource } from './process';
import { getUploadUrl, saveAssets, uploadAssets, uploadOrSaveAssets } from './upload';

export interface RunOptions extends GlobalOptions {
    readonly 'add-sources': boolean;
    readonly upload: boolean;
    readonly process: boolean;
    readonly path: string | string[];
    readonly include: string | string[];
    readonly exclude: string | string[];
    readonly 'dry-run': boolean;
    readonly url: string;
    readonly subdomain: string;
    readonly token: string;
    readonly 'include-sources': boolean;
    readonly output: string;
    readonly insecure: boolean;
    readonly force: boolean;
    readonly 'pass-with-no-files': boolean;
    readonly 'asset-error-behavior': string;
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
        name: 'url',
        type: String,
        description: 'URL to upload to.',
        alias: 'u',
    })
    .option({
        name: 'subdomain',
        type: String,
        description: 'Subdomain to upload to. Do not use on on-premise environments.',
        alias: 's',
    })
    .option({
        name: 'token',
        type: String,
        description: 'Symbol submission token. Required when subdomain is provided.',
        alias: 't',
    })
    .option({
        name: 'output',
        alias: 'o',
        description: 'If set, archive with sourcemaps will be outputted to this path instead of being uploaded.',
        type: String,
    })
    .option({
        name: 'include-sources',
        type: Boolean,
        description: 'Uploads the sourcemaps with "sourcesContent" key.',
    })
    .option({
        name: 'insecure',
        alias: 'k',
        type: Boolean,
        description: 'Disables HTTPS certificate checking.',
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

interface AssetResult {
    readonly processed?: boolean;
    readonly sourceAdded?: boolean;
}

export async function runSourcemapCommands({ opts, logger, getHelpMessage }: CommandContext<RunOptions>) {
    const sourceProcessor = new SourceProcessor(new DebugIdGenerator());
    const configPath = opts.config ?? (await findConfig());

    logger.debug(`reading config from ${configPath}`);

    const configResult = await loadOptions(configPath);
    if (configResult.isErr()) {
        return configResult;
    }

    const config = configResult.data;
    const runOptions = config ? { ...joinOptions('run')(config), ...opts } : opts;
    const processOptions = config ? { ...joinOptions('process')(config), ...opts } : opts;
    const addSourcsOptions = config ? { ...joinOptions('add-sources')(config), ...opts } : opts;
    const uploadOptions = config ? { ...joinOptions('upload')(config), ...opts } : opts;

    const searchPath =
        opts.path ??
        (config?.path && configPath ? relativePaths(config.path, path.dirname(configPath)) : process.cwd());

    logger.trace(`resolved options: \n${JSON.stringify(opts, null, '  ')}`);

    const runProcess = runOptions.process ?? false;
    const runAddSources = runOptions['add-sources'] ?? false;
    const runUpload = runOptions.upload ?? false;
    if (!runAddSources && !runUpload && !runProcess) {
        logger.info(getHelpMessage());
        return Err('--process, --add-sources and/or --upload must be specified');
    }

    const searchPaths = normalizePaths(searchPath, process.cwd());
    if (!searchPaths.length) {
        logger.info(getHelpMessage());
        return Err('path must be specified');
    }

    const uploadUrlResult = getUploadUrl(uploadOptions);
    if (uploadUrlResult.isErr()) {
        logger.info(getHelpMessage());
        return uploadUrlResult;
    }
    const uploadUrl = uploadUrlResult.data;

    const logInfo = log(logger, 'info');
    const logDebug = log(logger, 'debug');
    const logTrace = log(logger, 'trace');
    const logDebugAsset = logAsset(logger, 'trace');
    const logTraceAsset = logAsset(logger, 'trace');
    const logDebugAssets = logAssets(logger, 'debug');
    const logTraceAssets = logAssets(logger, 'trace');

    const assetErrorBehaviorResult = getErrorBehavior(runOptions['asset-error-behavior'] ?? 'exit');
    if (assetErrorBehaviorResult.isErr()) {
        logger.info(getHelpMessage());
        return assetErrorBehaviorResult;
    }

    const assetErrorBehavior = assetErrorBehaviorResult.data;

    const handleFailedAsset = handleError(assetErrorBehavior);

    const logAssetBehaviorError = (asset: Asset) => (err: string, level: LogLevel) =>
        logAsset(logger, level)(err)(asset);

    const readAssetCommand = (asset: Asset) =>
        pipe(
            asset,
            logTraceAsset('reading source and sourcemap'),
            readSourceAndSourceMap(sourceProcessor),
            R.map(logDebugAssets('read source and sourcemap')),
            R.mapErr((err) => `${asset.name}: ${err}`),
            handleFailedAsset(logAssetBehaviorError(asset)),
        );

    const handleAssetCommand = (process: boolean, addSources: boolean) => (asset: SourceAndSourceMap) =>
        pipe(
            asset,
            process
                ? flow(
                      logTraceAssets('processing source and sourcemap'),
                      processSource(processOptions.force ?? false),
                      logDebugAssets('processed source and sourcemap'),
                      (result) => ({ ...result, processed: true } as SourceAndSourceMap & AssetResult),
                  )
                : pass,
            addSources
                ? (assets) =>
                      pipe(
                          assets.sourceMap,
                          logTraceAsset('adding sources to sourcemap'),
                          addSourceToSourceMap(addSourcsOptions.force ?? false),
                          R.map(logDebugAsset('source added to sourcemap')),
                          R.map(
                              ({ content }) =>
                                  ({ ...assets, sourceMap: { ...assets.sourceMap, content } } as SourceAndSourceMap),
                          ),
                          R.map((result) => ({ ...result, sourceAdded: true } as SourceAndSourceMap & AssetResult)),
                      )
                : Ok,
            R.map(
                runOptions['dry-run']
                    ? Ok
                    : flow(
                          logTraceAssets('writing source and sourcemap'),
                          writeSourceAndSourceMap,
                          R.map(logDebugAssets('wrote source and sourcemap')),
                      ),
            ),
            R.mapErr((err) => `${asset.source.name}: ${err}`),
            handleFailedAsset(logAssetBehaviorError(asset.source)),
        );

    const saveArchiveCommandResult = runOptions.upload
        ? await uploadOrSaveAssets(
              uploadUrl,
              uploadOptions.output,
              (url) =>
                  uploadAssets(
                      url,
                      { ignoreSsl: uploadOptions.insecure ?? false },
                      uploadOptions['include-sources'] ?? false,
                  ),
              (path) => flow(saveAssets(path, uploadOptions['include-sources'] ?? false), Ok),
          )
        : Ok(undefined);

    if (saveArchiveCommandResult.isErr()) {
        return saveArchiveCommandResult;
    }

    const saveArchiveCommand = saveArchiveCommandResult.data;

    const isAssetProcessedCommand = (asset: AssetWithContent<RawSourceMap>) =>
        pipe(
            asset,
            logTraceAsset('checking if asset is processed'),
            isAssetProcessed(sourceProcessor),
            logDebug(
                ({ asset, result }) => `${asset.name}: ` + (result ? 'asset is processed' : 'asset is not processed'),
            ),
        );

    const filterProcessedAssetsCommand = (assets: AssetWithContent<RawSourceMap>[]) =>
        pipe(
            assets,
            mapAsync(isAssetProcessedCommand),
            filter((f) => f.result),
            map((f) => f.asset as AssetWithContent<RawSourceMapWithDebugId>),
        );

    const uploadCommand = saveArchiveCommand
        ? (assets: SourceAndSourceMap[]) =>
              pipe(
                  assets,
                  logDebug(`running upload...`),
                  map((t) => t.sourceMap),
                  filterProcessedAssetsCommand,
                  uploadOptions['pass-with-no-files']
                      ? Ok
                      : failIfEmpty('no processed sourcemaps found, make sure to run process'),
                  R.map(uniqueBy((asset) => asset.content.debugId)),
                  R.map((assets) =>
                      uploadOptions['dry-run']
                          ? Ok({ rxid: '<dry-run>' })
                          : assets.length
                          ? saveArchiveCommand(assets)
                          : Ok(null),
                  ),
                  R.map(
                      logInfo((result: UploadResult | null) =>
                          result ? `uploaded ${assets.length} files: ${result.rxid}` : `no files uploaded`,
                      ),
                  ),
                  R.map(() => assets),
              )
        : undefined;

    const includePaths = normalizePaths(runOptions.include);
    const excludePaths = normalizePaths(runOptions.exclude);
    const { isIncluded, isExcluded } = await buildIncludeExclude(includePaths, excludePaths, logTrace);

    return pipe(
        searchPaths,
        find,
        logDebug((r) => `found ${r.length} files`),
        map(logTrace((result) => `found file: ${result.path}`)),
        isIncluded ? filterAsync(isIncluded) : pass,
        isExcluded ? filterAsync(flow(isExcluded, not)) : pass,
        filter((t) => t.direct || matchSourceExtension(t.path)),
        map((t) => t.path),
        logDebug((r) => `found ${r.length} source files`),
        map(logTrace((path) => `found source file: ${path}`)),
        map(toAsset),
        opts['pass-with-no-files'] ? Ok : failIfEmpty('no source files found'),
        R.map(flow(mapAsync(readAssetCommand), R.flatMap)),
        R.map(filterBehaviorSkippedElements),
        R.map(map(printAssetInfo(logger))),
        R.map(flow(mapAsync(handleAssetCommand(runProcess, runAddSources)), R.flatMap)),
        R.map(filterBehaviorSkippedElements),
        R.map(
            runProcess
                ? logInfo(
                      (assets) =>
                          `processed ${assets.reduce(
                              (sum, r) => sum + (r.processed ? 1 : 0),
                              0,
                          )} source and sourcemaps`,
                  )
                : pass,
        ),
        R.map(
            runAddSources
                ? logInfo(
                      (assets) =>
                          `added sources to ${assets.reduce((sum, r) => sum + (r.sourceAdded ? 1 : 0), 0)} sourcemaps`,
                  )
                : pass,
        ),
        R.map(uploadCommand ?? Ok),
    );
}

function printAssetInfo(logger: CliLogger) {
    return function printAssetInfo<T extends SourceAndSourceMap>(asset: T) {
        logger.debug(`${asset.source.path}`);
        logger.debug(`└── ${asset.sourceMap.path}`);
        return asset;
    };
}
