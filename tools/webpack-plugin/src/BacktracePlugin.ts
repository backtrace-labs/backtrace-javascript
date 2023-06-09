import { DebugIdGenerator } from '@backtrace/sourcemap-tools';
import crypto from 'crypto';
import { Compilation, Compiler, WebpackPluginInstance } from 'webpack';
import { ConcatSource, RawSource, SourceMapSource } from 'webpack-sources';

export interface BacktracePluginOptions {
    debugIdGenerator?: DebugIdGenerator;
}

export class BacktracePlugin implements WebpackPluginInstance {
    private readonly _debugIdGenerator: DebugIdGenerator;

    constructor(public readonly options?: BacktracePluginOptions) {
        this._debugIdGenerator = options?.debugIdGenerator ?? new DebugIdGenerator();
    }

    public apply(compiler: Compiler) {
        const assetDebugIds = new Map<string, string>();
        const processedSourceMapsForSources = new Set<string>();

        compiler.hooks.thisCompilation.tap(BacktracePlugin.name, (compilation) => {
            compilation.hooks.processAssets.tap(
                {
                    name: BacktracePlugin.name,
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
                    name: BacktracePlugin.name,
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
                    name: BacktracePlugin.name,
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
    }

    private injectSourceSnippet(compilation: Compilation, key: string, debugId: string): boolean {
        const asset = compilation.getAsset(key);
        if (!asset) {
            return false;
        }

        const sourceSnippet = this._debugIdGenerator.generateSourceSnippet(debugId);
        compilation.updateAsset(key, new ConcatSource(asset.source as never, sourceSnippet) as never);
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

        const { source, map } = asset.source.sourceAndMap();
        this._debugIdGenerator.addSourceMapKey(map, debugId);
        const newSourceMap = new SourceMapSource(source as never, 'x', map as never);
        compilation.updateAsset(key, newSourceMap as never);

        return true;
    }

    private injectSourceComment(compilation: Compilation, key: string, debugId: string): boolean {
        const asset = compilation.getAsset(key);
        if (!asset) {
            return false;
        }

        const comment = this._debugIdGenerator.generateSourceComment(debugId);
        compilation.updateAsset(key, new ConcatSource(asset.source as never, `\n${comment}`) as never);

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

        let sourceMapKeys = assetInfo.related?.sourceMap;
        if (!sourceMapKeys) {
            return false;
        }

        if (!Array.isArray(sourceMapKeys)) {
            sourceMapKeys = [sourceMapKeys];
        }

        for (const sourceMapKey of sourceMapKeys) {
            if (processedSourceMaps.has(sourceMapKey)) {
                continue;
            }

            const sourceMapAsset = compilation.getAsset(sourceMapKey);
            if (!sourceMapAsset) {
                continue;
            }

            let sourceMapSource = sourceMapAsset.source.source().toString('utf8');
            const debugSourceMapObj = this._debugIdGenerator.addSourceMapKey({}, debugId);
            for (const [key, value] of Object.entries(debugSourceMapObj)) {
                // Replace closing bracket with additional key-values
                // Keep the matched whitespaces at the end
                sourceMapSource = sourceMapSource.replace(/}(\s*)$/, `,"${key}":${JSON.stringify(value)}}$1`);
            }

            compilation.updateAsset(sourceMapKey, new RawSource(sourceMapSource) as never);

            processedSourceMaps.add(sourceMapKey);
        }

        return true;
    }
}
