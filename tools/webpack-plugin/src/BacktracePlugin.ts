import {
    Asset,
    BacktracePluginOptions,
    matchSourceExtension,
    processAndUploadAssetsCommand,
} from '@backtrace-labs/sourcemap-tools';
import path from 'path';
import webpack, { WebpackPluginInstance } from 'webpack';

export class BacktracePlugin implements WebpackPluginInstance {
    constructor(public readonly options?: BacktracePluginOptions) {}

    public apply(compiler: webpack.Compiler) {
        compiler.hooks.afterEmit.tapPromise(BacktracePlugin.name, async (compilation) => {
            const logger = compilation.getLogger(BacktracePlugin.name);
            const outputDir = compilation.outputOptions.path;
            if (!outputDir) {
                logger.error(
                    'Skipping everything because outputOptions.path is not set. If you see this error, please report this to Backtrace.',
                );
                return;
            }

            const processAndUpload = processAndUploadAssetsCommand(this.options ?? {}, {
                beforeAll: (assets) => logger.log(`processing ${assets.length} files`),

                afterProcess: (asset) => logger.log(`[${asset.asset.name}] processed source and sourcemap`),
                afterWrite: (asset) => logger.log(`[${asset.asset.name}] wrote source and sourcemap to file`),
                assetFinished: (asset) => logger.info(`[${asset.asset.name}] asset processed successfully`),
                assetError: (asset) => logger.error(`[${asset.asset.name}] ${asset.error}`),

                beforeArchive: (paths) => logger.log(`creating archive to upload from ${paths.length} files`),
                beforeUpload: () => logger.log(`uploading sourcemaps...`),
                afterUpload: (result) => logger.info(`sourcemaps uploaded to Backtrace: ${result.rxid}`),
                uploadError: (error) => logger.error(`failed to upload sourcemaps: ${error}`),
            });

            const assets = Object.keys(compilation.assets)
                .filter(matchSourceExtension)
                .map<Asset>((asset) => ({ name: asset, path: path.join(outputDir, asset) }));

            await processAndUpload(assets);
        });
    }
}
