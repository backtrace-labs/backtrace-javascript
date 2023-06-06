import crypto from 'crypto';
import { Compilation, Compiler, WebpackPluginInstance } from 'webpack';
import { ConcatSource } from 'webpack-sources';

export class BacktracePlugin implements WebpackPluginInstance {
    public apply(compiler: Compiler) {
        const assetDebugIds = new Map<string, string>();

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

                        compilation.updateAsset(
                            key,
                            new ConcatSource(
                                asset.source as never,
                                `!function(){console.log("Injected ${debugId}")}()`,
                            ) as never,
                        );
                    }
                },
            );
        });
    }
}
