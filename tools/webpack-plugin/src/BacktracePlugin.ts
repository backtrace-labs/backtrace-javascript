import { DebugIdGenerator, SourceMapUploader, SourceProcessor } from '@backtrace/sourcemap-tools';
import path from 'path';
import webpack, { WebpackPluginInstance } from 'webpack';
import { BacktracePluginOptions } from './models/BacktracePluginOptions';

export class BacktracePlugin implements WebpackPluginInstance {
    private readonly _sourceMapProcessor: SourceProcessor;
    private readonly _sourceMapUploader?: SourceMapUploader;

    constructor(public readonly options?: BacktracePluginOptions) {
        this._sourceMapProcessor = new SourceProcessor(options?.debugIdGenerator ?? new DebugIdGenerator());

        this._sourceMapUploader =
            options?.sourceMapUploader ?? (options?.uploadUrl ? new SourceMapUploader(options.uploadUrl) : undefined);
    }

    public apply(compiler: webpack.Compiler) {
        compiler.hooks.afterEmit.tapPromise(BacktracePlugin.name, async (compilation) => {
            const logger = compilation.getLogger(BacktracePlugin.name);
            if (!compilation.outputOptions.path) {
                logger.error('skipping everything because outputOptions.path is not set, a bug?');
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
                logger.time(`[${asset}] process source and sourcemap`);

                let debugId: string;
                try {
                    debugId = await this._sourceMapProcessor.processSourceAndSourceMapFiles(sourcePath, sourceMapPath);
                    logger.timeEnd(`[${asset}] process source and sourcemap`);
                } catch (err) {
                    logger.timeEnd(`[${asset}] process source and sourcemap`);
                    logger.error(`[${asset}] process source and sourcemap failed:`, err);
                    continue;
                }

                if (this._sourceMapUploader) {
                    logger.time(`[${asset}] upload sourcemap`);
                    try {
                        await this._sourceMapUploader.upload(sourceMapPath, debugId);
                        logger.timeEnd(`[${asset}] upload sourcemap`);
                    } catch (err) {
                        logger.timeEnd(`[${asset}] upload sourcemap`);
                        logger.error(`[${asset}] upload sourcemap failed:`, err);
                    }
                    logger.log(`[${asset}] file processed and sourcemap uploaded`);
                } else {
                    logger.log(`[${asset}] file processed`);
                }
            }
        });
    }
}
