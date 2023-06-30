import { DebugIdGenerator, SourceMapUploader, SourceProcessor } from '@backtrace/sourcemap-tools';
import path from 'path';
import webpack, { WebpackPluginInstance } from 'webpack';
import { statsPrinter } from './helpers/statsPrinter';
import { AssetStats } from './models/AssetStats';
import { BacktracePluginOptions } from './models/BacktracePluginOptions';

export class BacktracePlugin implements WebpackPluginInstance {
    private readonly _sourceProcessor: SourceProcessor;
    private readonly _sourceMapUploader?: SourceMapUploader;

    constructor(public readonly options?: BacktracePluginOptions) {
        this._sourceProcessor = new SourceProcessor(new DebugIdGenerator());
        this._sourceMapUploader = options?.uploadUrl
            ? new SourceMapUploader(options.uploadUrl, options.uploadOptions)
            : undefined;
    }

    public apply(compiler: webpack.Compiler) {
        const assetStats = new Map<string, AssetStats>();

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
                const stats: AssetStats = {};
                assetStats.set(asset, stats);

                let debugId: string;

                logger.time(`[${asset}] process source and sourcemap`);
                try {
                    debugId = await this._sourceProcessor.processSourceAndSourceMapFiles(sourcePath, sourceMapPath);
                    stats.debugId = debugId;
                    stats.processSource = true;
                } catch (err) {
                    logger.error(`[${asset}] process source and sourcemap failed:`, err);
                    stats.processSource = err instanceof Error ? err : new Error('Unknown error.');
                    continue;
                } finally {
                    logger.timeEnd(`[${asset}] process source and sourcemap`);
                }

                if (!this._sourceMapUploader) {
                    logger.log(`[${asset}] file processed`);
                    continue;
                }

                logger.time(`[${asset}] upload sourcemap`);
                try {
                    const result = await this._sourceMapUploader.upload(sourceMapPath, debugId);
                    stats.sourceMapUpload = result;
                    logger.log(`[${asset}] file processed and sourcemap uploaded`);
                } catch (err) {
                    logger.error(`[${asset}] upload sourcemap failed:`, err);
                    stats.sourceMapUpload = err instanceof Error ? err : new Error('Unknown error.');
                } finally {
                    logger.timeEnd(`[${asset}] upload sourcemap`);
                }
            }

            const printer = statsPrinter(compilation.getLogger(BacktracePlugin.name));
            for (const [key, stats] of assetStats) {
                printer(key, stats);
            }
        });
    }
}
