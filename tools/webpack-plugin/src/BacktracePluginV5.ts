import { ContentAppender, DebugIdGenerator, SourceMapUploader } from '@backtrace/sourcemap-tools';
import crypto from 'crypto';
import path from 'path';
import { AssetInfo, Compilation, Compiler, WebpackPluginInstance } from 'webpack';
import { SourceMapSource } from 'webpack-sources';
import { BacktraceWebpackSourceGenerator } from './BacktraceWebpackSourceGenerator';
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
        const assetDebugIds = new Map<string, string>();
        const processedSourceMapsForSources = new Set<string>();

        compiler.hooks.thisCompilation.tap(BacktracePluginV5.name, (compilation) => {
            compilation.hooks.processAssets.tap(
                {
                    name: BacktracePluginV5.name,
                    stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
                },
                (assets) => {
                    for (const key in assets) {
                        const debugId = crypto.randomUUID();
                        assetDebugIds.set(key, debugId);

                        this.injectSourceSnippet(compilation, key, debugId);
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
                    for (const key in assets) {
                        const debugId = assetDebugIds.get(key);
                        if (!debugId) {
                            continue;
                        }

                        if (this.injectSourceMapDebugId(compilation, key, debugId)) {
                            processedSourceMapsForSources.add(key);
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
                    for (const key in assets) {
                        const asset = compilation.getAsset(key);
                        if (!asset) {
                            continue;
                        }

                        const debugId = assetDebugIds.get(key);
                        if (!debugId) {
                            continue;
                        }

                        this.injectSourceComment(compilation, key, debugId);

                        // If the sourcemap has not been processed for some reason,
                        // attempt to manually append the information
                        if (!processedSourceMapsForSources.has(key)) {
                            if (this.appendSourceMapDebugId(compilation, key, debugId, processedSourceMaps)) {
                                processedSourceMapsForSources.add(key);
                            }
                        }
                    }
                },
            );
        });

        const uploader = this._sourceMapUploader;
        if (uploader) {
            compiler.hooks.afterEmit.tapPromise(BacktracePluginV5.name, async (compilation) => {
                const outputPath = compilation.outputOptions.path;
                if (!outputPath) {
                    throw new Error('Output path is required to upload sourcemaps.');
                }

                for (const key in compilation.assets) {
                    const asset = compilation.getAsset(key);
                    if (!asset) {
                        continue;
                    }

                    const debugId = assetDebugIds.get(key);
                    if (!debugId) {
                        continue;
                    }

                    const sourceMapKeys = this.getSourceMapKeys(asset.info);
                    if (!sourceMapKeys) {
                        continue;
                    }

                    for (const key of sourceMapKeys) {
                        const sourceMapAsset = compilation.getAsset(key);
                        if (!sourceMapAsset) {
                            continue;
                        }

                        const sourceMapPath = path.join(outputPath, sourceMapAsset.name);
                        await uploader.upload(sourceMapPath, debugId);
                    }
                }
            });
        }
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
