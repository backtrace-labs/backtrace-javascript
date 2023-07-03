import { DebugIdGenerator, SourceProcessor, SymbolUploader, ZipArchive } from '@backtrace/sourcemap-tools';
import path from 'path';
import webpack, { WebpackPluginInstance } from 'webpack';
import { BacktracePluginOptions } from './models/BacktracePluginOptions';

export class BacktracePlugin implements WebpackPluginInstance {
    private readonly _sourceProcessor: SourceProcessor;
    private readonly _sourceMapUploader?: SymbolUploader;

    constructor(public readonly options?: BacktracePluginOptions) {
        this._sourceProcessor = new SourceProcessor(new DebugIdGenerator());
        this._sourceMapUploader = options?.uploadUrl
            ? new SymbolUploader(options.uploadUrl, options.uploadOptions)
            : undefined;
    }

    public apply(compiler: webpack.Compiler) {
        const processResults = new Map<string, string | Error>();
        let uploadResult: string | Error | undefined;

        compiler.hooks.afterEmit.tapPromise(BacktracePlugin.name, async (compilation) => {
            const logger = compilation.getLogger(BacktracePlugin.name);
            if (!compilation.outputOptions.path) {
                logger.error(
                    'Skipping everything because outputOptions.path is not set. If you see this error, please report this to Backtrace.',
                );
                return;
            }

            const entries: [string, string, string][] = [];

            for (const asset in compilation.assets) {
                if (!asset.match(/\.(c|m)?jsx?$/)) {
                    logger.debug(`[${asset}] skipping processing, extension does not match`);
                    continue;
                }

                const map = asset + '.map';
                if (!compilation.assets[map]) {
                    logger.debug(`[${asset}] skipping processing, map file not found`);
                    continue;
                }

                const assetPath = path.join(compilation.outputOptions.path, asset);
                const sourceMapPath = path.join(compilation.outputOptions.path, map);

                logger.debug(`adding asset ${assetPath} with sourcemap ${sourceMapPath}`);
                entries.push([asset, assetPath, sourceMapPath]);
            }

            logger.log(`received ${entries.length} files for processing`);

            for (const [asset, sourcePath, sourceMapPath] of entries) {
                let debugId: string;

                logger.time(`[${asset}] process source and sourcemap`);
                try {
                    debugId = await this._sourceProcessor.processSourceAndSourceMapFiles(sourcePath, sourceMapPath);
                    processResults.set(asset, debugId);
                } catch (err) {
                    logger.error(`[${asset}] process source and sourcemap failed:`, err);
                    processResults.set(asset, err instanceof Error ? err : new Error('Unknown error.'));
                    continue;
                } finally {
                    logger.timeEnd(`[${asset}] process source and sourcemap`);
                }
            }

            if (this._sourceMapUploader) {
                logger.time(`upload sourcemaps`);
                try {
                    const archive = new ZipArchive();
                    const request = this._sourceMapUploader.uploadSymbol(archive);

                    for (const [asset, , sourceMapPath] of entries) {
                        archive.append(`${asset}.map`, sourceMapPath);
                    }

                    await archive.finalize();
                    const result = await request;
                    uploadResult = result.rxid;
                } catch (err) {
                    logger.error(`upload sourcemaps failed:`, err);
                    uploadResult = err instanceof Error ? err : new Error('Unknown error.');
                } finally {
                    logger.timeEnd(`upload sourcemaps`);
                }
            }

            for (const [key, result] of processResults) {
                if (typeof result === 'string') {
                    logger.info(`[${key}] processed file successfully`);
                    logger.debug(`\tdebugId: ${result}`);
                } else {
                    logger.error(`[${key}] failed to process file: ${result.message}`);
                    logger.debug(`Error stack trace: ${result.stack}`);
                }
            }

            if (uploadResult) {
                if (typeof uploadResult === 'string') {
                    logger.info(`uploaded sourcemaps successfully`);
                    logger.debug(`\trxid: ${uploadResult}`);
                } else {
                    logger.error(`failed to upload sourcemaps: ${uploadResult.message}`);
                    logger.debug(`Error stack trace: ${uploadResult.stack}`);
                }
            }
        });
    }
}
