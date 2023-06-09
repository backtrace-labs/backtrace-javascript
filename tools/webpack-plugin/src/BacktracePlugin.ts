import { DebugIdGenerator } from '@backtrace/sourcemap-tools';
import crypto from 'crypto';
import { Compilation, Compiler, WebpackPluginInstance } from 'webpack';
import { ConcatSource, SourceMapSource } from 'webpack-sources';

export interface BacktracePluginOptions {
    debugIdGenerator?: DebugIdGenerator;
}

export class BacktracePlugin implements WebpackPluginInstance {
    constructor(public readonly options?: BacktracePluginOptions) {}

    public apply(compiler: Compiler) {
        const assetDebugIds = new Map<string, string>();
        const debugIdGenerator = this.options?.debugIdGenerator ?? new DebugIdGenerator();

        compiler.hooks.thisCompilation.tap(BacktracePlugin.name, (compilation) => {
            compilation.hooks.processAssets.tap(
                {
                    name: BacktracePlugin.name,
                    stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
                },
                (assets) => {
                    for (const key in assets) {
                        const asset = compilation.getAsset(key);
                        if (!asset) {
                            continue;
                        }

                        const debugId = crypto.randomUUID();
                        assetDebugIds.set(key, debugId);

                        const sourceSnippet = debugIdGenerator.generateSourceSnippet(debugId);
                        compilation.updateAsset(key, new ConcatSource(asset.source as never, sourceSnippet) as never);
                    }
                },
            );

            compilation.hooks.processAssets.tap(
                {
                    name: BacktracePlugin.name,
                    stage: Compilation.PROCESS_ASSETS_STAGE_DEV_TOOLING,
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

                        if (asset.source instanceof SourceMapSource) {
                            const { source, map } = asset.source.sourceAndMap();
                            debugIdGenerator.addSourceMapKey(map, debugId);
                            const newSourceMap = new SourceMapSource(source as never, 'x', map as never);
                            compilation.updateAsset(key, newSourceMap as never);
                        }
                    }
                    return;
                },
            );

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

                        const comment = debugIdGenerator.generateSourceComment(debugId);
                        compilation.updateAsset(key, new ConcatSource(asset.source as never, `\n${comment}`) as never);
                    }
                },
            );
        });
    }
}
