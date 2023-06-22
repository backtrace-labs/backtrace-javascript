import { ContentAppender, DebugIdGenerator } from '@backtrace/sourcemap-tools';
import crypto from 'crypto';
import { Compiler, WebpackPluginInstance } from 'webpack';
import { BacktraceWebpackSourceGenerator } from './BacktraceWebpackSourceGenerator';
import { BacktracePluginOptions } from './models/BacktracePluginOptions';

export class BacktracePluginV4 implements WebpackPluginInstance {
    private readonly _sourceGenerator: BacktraceWebpackSourceGenerator;

    constructor(public readonly options?: BacktracePluginOptions) {
        this._sourceGenerator = new BacktraceWebpackSourceGenerator(
            options?.debugIdGenerator ?? new DebugIdGenerator(),
            new ContentAppender(),
        );
    }

    public apply(compiler: Compiler) {
        const assetDebugIds = new Map<string, string>();

        compiler.hooks.emit.tap(BacktracePluginV4.name, (compilation) => {
            for (const key in compilation.assets) {
                let source = compilation.assets[key];

                let debugId;
                if (key.match(/.(c|m)?jsx?$/)) {
                    debugId = crypto.randomUUID();
                    assetDebugIds.set(key, debugId);

                    source = this._sourceGenerator.addDebugIdToSource(source as never, debugId) as typeof source;
                    source = this._sourceGenerator.addDebugIdCommentToSource(source as never, debugId) as typeof source;
                } else if (key.match(/\.(c|m)?jsx?\.map$/)) {
                    // The .map replacement should account for most of the use cases
                    const sourceKey = key.replace(/.map$/, '');
                    debugId = assetDebugIds.get(sourceKey);
                    if (!debugId) {
                        continue;
                    }

                    source = this._sourceGenerator.addDebugIdToRawSourceMap(source as never, debugId) as never;
                }

                compilation.assets[key] = source;
            }
        });
    }
}
