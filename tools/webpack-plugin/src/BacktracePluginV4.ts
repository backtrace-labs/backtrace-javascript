import { ContentAppender, DebugIdGenerator, SourceMapUploader } from '@backtrace/sourcemap-tools';
import crypto from 'crypto';
import path from 'path';
import { Compiler, WebpackPluginInstance } from 'webpack';
import { BacktraceWebpackSourceGenerator } from './BacktraceWebpackSourceGenerator';
import { statsPrinter } from './helpers/statsPrinter';
import { AssetStats } from './models/AssetStats';
import { BacktracePluginOptions } from './models/BacktracePluginOptions';

export class BacktracePluginV4 implements WebpackPluginInstance {
    private readonly _sourceGenerator: BacktraceWebpackSourceGenerator;
    private readonly _sourceMapUploader?: SourceMapUploader;

    constructor(public readonly options?: BacktracePluginOptions) {
        this._sourceGenerator = new BacktraceWebpackSourceGenerator(
            options?.debugIdGenerator ?? new DebugIdGenerator(),
            new ContentAppender(),
        );

        this._sourceMapUploader =
            options?.sourceMapUploader ?? (options?.uploadUrl ? new SourceMapUploader(options.uploadUrl) : undefined);
    }

    public apply(compiler: Compiler) {
        const assetStats = new Map<string, AssetStats>();

        compiler.hooks.emit.tap(BacktracePluginV4.name, (compilation) => {
            const logger = compilation.getLogger(BacktracePluginV4.name);
            for (const key in compilation.assets) {
                let source = compilation.assets[key];

                if (key.match(/\.(c|m)?jsx?$/)) {
                    const debugId = crypto.randomUUID();
                    const stats: AssetStats = { debugId };
                    assetStats.set(key, stats);
                    logger.log(`[${key}] generated debug ID ${debugId}`);

                    logger.time(`[${key}] inject source snippet`);
                    try {
                        source = this._sourceGenerator.addDebugIdToSource(source as never, debugId) as typeof source;
                        logger.timeEnd(`[${key}] inject source snippet`);
                        stats.sourceSnippet = true;
                    } catch (err) {
                        stats.sourceSnippet = err instanceof Error ? err : new Error('Unknown error.');
                    }

                    logger.time(`[${key}] inject sourcemap key`);
                    try {
                        source = this._sourceGenerator.addDebugIdCommentToSource(
                            source as never,
                            debugId,
                        ) as typeof source;
                        logger.timeEnd(`[${key}] inject sourcemap key`);
                        stats.sourceComment = true;
                    } catch (err) {
                        stats.sourceComment = err instanceof Error ? err : new Error('Unknown error.');
                    }
                } else if (key.match(/\.(c|m)?jsx?\.map$/)) {
                    // The .map replacement should account for most of the use cases
                    const sourceKey = key.replace(/.map$/, '');
                    const stats = assetStats.get(sourceKey);
                    if (!stats) {
                        continue;
                    }

                    logger.time(`[${key}] append sourcemap key`);
                    try {
                        source = this._sourceGenerator.addDebugIdToRawSourceMap(
                            source as never,
                            stats.debugId,
                        ) as never;
                        logger.timeEnd(`[${key}] append sourcemap key`);
                        stats.sourceMapAppend = true;
                    } catch (err) {
                        stats.sourceMapAppend = err instanceof Error ? err : new Error('Unknown error.');
                    }
                }

                compilation.assets[key] = source;
            }
        });

        compiler.hooks.afterEmit.tapPromise(BacktracePluginV4.name, async (compilation) => {
            const logger = compilation.getLogger(BacktracePluginV4.name);

            const outputPath = compilation.outputOptions.path;
            if (!outputPath) {
                throw new Error('Output path is required to upload sourcemaps.');
            }

            for (const key in compilation.assets) {
                if (!key.match(/\.(c|m)?jsx?\.map$/)) {
                    continue;
                }

                const sourceKey = key.replace(/.map$/, '');
                const stats = assetStats.get(sourceKey);
                if (!stats) {
                    continue;
                }

                const sourceMapAsset = compilation.getAsset(key);
                if (!sourceMapAsset) {
                    stats.sourceMapUpload = false;
                    continue;
                }

                if (!this._sourceMapUploader) {
                    stats.sourceMapUpload = false;
                    continue;
                }

                const sourceMapPath = path.join(outputPath, sourceMapAsset.name);

                logger.time(`[${key}] upload sourcemap`);
                try {
                    const result = await this._sourceMapUploader.upload(sourceMapPath, stats.debugId);
                    logger.timeEnd(`[${key}] upload sourcemap`);
                    stats.sourceMapUpload = result;
                } catch (err) {
                    stats.sourceMapAppend = err instanceof Error ? err : new Error('Unknown error.');
                }
                logger.timeEnd(`[${key}] upload sourcemap`);
            }
        });

        compiler.hooks.afterEmit.tap(BacktracePluginV4.name, (compilation) => {
            const printer = statsPrinter(compilation.getLogger(BacktracePluginV4.name));
            for (const [key, stats] of assetStats) {
                printer(key, stats);
            }
        });
    }
}
