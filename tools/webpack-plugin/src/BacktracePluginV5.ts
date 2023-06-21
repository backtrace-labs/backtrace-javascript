import { ContentAppender, DebugIdGenerator, SourceMapUploader } from '@backtrace/sourcemap-tools';
import crypto from 'crypto';
import path from 'path';
import { AssetInfo, Compilation, Compiler, WebpackPluginInstance } from 'webpack';
import { SourceMapSource } from 'webpack-sources';
import { BacktraceWebpackSourceGenerator } from './BacktraceWebpackSourceGenerator';
import { statsPrinter } from './helpers/statsPrinter';
import { AssetStats } from './models/AssetStats';
import { BacktracePluginOptions } from './models/BacktracePluginOptions';

export class BacktracePluginV5 implements WebpackPluginInstance {
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

        compiler.hooks.thisCompilation.tap(BacktracePluginV5.name, (compilation) => {
            compilation.hooks.processAssets.tap(
                {
                    name: BacktracePluginV5.name,
                    stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
                },
                (assets) => {
                    const logger = compilation.getLogger(BacktracePluginV5.name);

                    for (const key in assets) {
                        if (!key.match(/\.(c|m)?jsx?$/)) {
                            continue;
                        }

                        const debugId = crypto.randomUUID();
                        assetStats.set(key, { debugId });

                        logger.log(`[${key}] generated debug ID ${debugId}`);
                    }
                },
            );

            compilation.hooks.processAssets.tap(
                {
                    name: BacktracePluginV5.name,
                    stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
                },
                (assets) => {
                    const logger = compilation.getLogger(BacktracePluginV5.name);

                    for (const key in assets) {
                        const stats = assetStats.get(key);
                        if (!stats) {
                            continue;
                        }

                        const debugId = stats.debugId;

                        logger.time(`[${key}] inject source snippet`);
                        try {
                            this.injectSourceSnippet(compilation, key, debugId);
                            logger.timeEnd(`[${key}] inject source snippet`);
                            stats.sourceSnippet = true;
                        } catch (err) {
                            stats.sourceSnippet = err instanceof Error ? err : new Error('Unknown error.');
                        }
                    }
                },
            );

            compilation.hooks.processAssets.tap(
                {
                    name: BacktracePluginV5.name,
                    stage: Compilation.PROCESS_ASSETS_STAGE_DEV_TOOLING,
                    additionalAssets: true,
                },
                (assets) => {
                    const logger = compilation.getLogger(BacktracePluginV5.name);

                    for (const key in assets) {
                        const stats = assetStats.get(key);
                        if (!stats) {
                            continue;
                        }

                        const debugId = stats.debugId;

                        logger.time(`[${key}] inject sourcemap key`);
                        try {
                            if (this.injectSourceMapDebugId(compilation, key, debugId)) {
                                logger.timeEnd(`[${key}] inject sourcemap key`);
                                stats.sourceMapAppend = true;
                            } else {
                                stats.sourceMapAppend = false;
                            }
                        } catch (err) {
                            stats.sourceComment = err instanceof Error ? err : new Error('Unknown error.');
                        }
                    }
                    return;
                },
            );

            const processedSourceMaps = new Set<string>();
            compilation.hooks.processAssets.tap(
                {
                    name: BacktracePluginV5.name,
                    stage: Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE,
                },
                (assets) => {
                    const logger = compilation.getLogger(BacktracePluginV5.name);

                    for (const key in assets) {
                        const asset = compilation.getAsset(key);
                        if (!asset) {
                            continue;
                        }

                        const stats = assetStats.get(key);
                        if (!stats) {
                            continue;
                        }

                        const debugId = stats.debugId;

                        logger.time(`[${key}] inject source comment`);
                        try {
                            this.injectSourceComment(compilation, key, debugId);
                            logger.timeEnd(`[${key}] inject source comment`);
                            stats.sourceComment = true;
                        } catch (err) {
                            stats.sourceComment = err instanceof Error ? err : new Error('Unknown error.');
                        }

                        // If the sourcemap has not been processed for some reason,
                        // attempt to manually append the information
                        if (!stats.sourceMapAppend) {
                            logger.time(`[${key}] append sourcemap key`);
                            try {
                                if (this.appendSourceMapDebugId(compilation, key, debugId, processedSourceMaps)) {
                                    logger.timeEnd(`[${key}] append sourcemap key`);
                                    stats.sourceMapAppend = true;
                                } else {
                                    stats.sourceMapAppend = false;
                                }
                            } catch (err) {
                                stats.sourceMapAppend = err instanceof Error ? err : new Error('Unknown error.');
                            }
                        }
                    }
                },
            );
        });

        compiler.hooks.afterEmit.tapPromise(BacktracePluginV5.name, async (compilation) => {
            const logger = compilation.getLogger(BacktracePluginV5.name);

            const outputPath = compilation.outputOptions.path;
            if (!outputPath) {
                throw new Error('Output path is required to upload sourcemaps.');
            }

            for (const key in compilation.assets) {
                const asset = compilation.getAsset(key);
                if (!asset) {
                    continue;
                }

                const stats = assetStats.get(key);
                if (!stats) {
                    continue;
                }

                const sourceMapKeys = this.getSourceMapKeys(asset.info);
                if (!sourceMapKeys) {
                    stats.sourceMapUpload = false;
                    continue;
                }

                if (!this._sourceMapUploader) {
                    stats.sourceMapUpload = false;
                    continue;
                }

                for (const key of sourceMapKeys) {
                    const sourceMapAsset = compilation.getAsset(key);
                    if (!sourceMapAsset) {
                        continue;
                    }

                    logger.time(`[${key}] upload sourcemap`);
                    const sourceMapPath = path.join(outputPath, sourceMapAsset.name);
                    try {
                        const result = await this._sourceMapUploader.upload(sourceMapPath, stats.debugId);
                        logger.timeEnd(`[${key}] upload sourcemap`);
                        stats.sourceMapUpload = result;
                    } catch (err) {
                        stats.sourceMapUpload = err instanceof Error ? err : new Error('Unknown error.');
                    }
                }
            }
        });

        compiler.hooks.afterEmit.tap(BacktracePluginV5.name, (compilation) => {
            const printer = statsPrinter(compilation.getLogger(BacktracePluginV5.name));
            for (const [key, stats] of assetStats) {
                printer(key, stats);
            }
        });
    }

    private injectSourceSnippet(compilation: Compilation, key: string, debugId: string): boolean {
        const asset = compilation.getAsset(key);
        if (!asset) {
            return false;
        }

        const newSource = this._sourceGenerator.addDebugIdToSource(asset.source as never, debugId);

        compilation.updateAsset(key, newSource as never);
        return true;
    }

    private injectSourceMapDebugId(compilation: Compilation, key: string, debugId: string): boolean {
        const asset = compilation.getAsset(key);
        if (!asset) {
            return false;
        }

        if (!(asset.source instanceof SourceMapSource)) {
            return false;
        }

        const newSource = this._sourceGenerator.addDebugIdToSourceMap(asset.source, debugId);
        compilation.updateAsset(key, newSource as never);

        return true;
    }

    private injectSourceComment(compilation: Compilation, key: string, debugId: string): boolean {
        const asset = compilation.getAsset(key);
        if (!asset) {
            return false;
        }

        const newSource = this._sourceGenerator.addDebugIdCommentToSource(asset.source as never, debugId);
        compilation.updateAsset(key, newSource as never);

        return true;
    }

    /**
     * Manually appends debug ID keys to the sourcemap file.
     */
    private appendSourceMapDebugId(
        compilation: Compilation,
        key: string,
        debugId: string,
        processedSourceMaps: Set<string>,
    ): boolean {
        const assetInfo = compilation.assetsInfo.get(key);
        if (!assetInfo) {
            return false;
        }

        const sourceMapKeys = this.getSourceMapKeys(assetInfo);
        if (!sourceMapKeys) {
            return false;
        }

        for (const sourceMapKey of sourceMapKeys) {
            if (processedSourceMaps.has(sourceMapKey)) {
                continue;
            }

            const sourceMapAsset = compilation.getAsset(sourceMapKey);
            if (!sourceMapAsset) {
                continue;
            }

            const newSource = this._sourceGenerator.addDebugIdToRawSourceMap(sourceMapAsset.source as never, debugId);
            compilation.updateAsset(sourceMapKey, newSource as never);

            processedSourceMaps.add(sourceMapKey);
        }

        return true;
    }

    private getSourceMapKeys(assetInfo: AssetInfo) {
        const sourceMapKeys = assetInfo.related?.sourceMap;
        if (!sourceMapKeys) {
            return undefined;
        }

        if (!Array.isArray(sourceMapKeys)) {
            return [sourceMapKeys];
        }

        return sourceMapKeys;
    }
}
