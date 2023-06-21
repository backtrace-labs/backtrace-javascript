import { ContentAppender, DebugIdGenerator, SourceMapUploader } from '@backtrace/sourcemap-tools';
import crypto from 'crypto';
import path from 'path';
import { Compiler, WebpackPluginInstance } from 'webpack';
import { BacktraceWebpackSourceGenerator } from './BacktraceWebpackSourceGenerator';
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

        const uploader = this._sourceMapUploader;
        if (uploader) {
            compiler.hooks.afterEmit.tapPromise(BacktracePluginV4.name, async (compilation) => {
                const outputPath = compilation.outputOptions.path;
                if (!outputPath) {
                    throw new Error('Output path is required to upload sourcemaps.');
                }

                for (const key in compilation.assets) {
                    if (!key.match(/\.(c|m)?jsx?\.map$/)) {
                        continue;
                    }

                    const sourceKey = key.replace(/.map$/, '');
                    const debugId = assetDebugIds.get(sourceKey);
                    if (!debugId) {
                        continue;
                    }

                    const sourceMapAsset = compilation.getAsset(key);
                    if (!sourceMapAsset) {
                        continue;
                    }

                    const sourceMapPath = path.join(outputPath, sourceMapAsset.name);
                    await uploader.upload(sourceMapPath, debugId);
                }
            });
        }
    }
}
