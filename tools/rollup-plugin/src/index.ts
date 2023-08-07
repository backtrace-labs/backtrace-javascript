import {
    Asset,
    BacktracePluginOptions,
    matchSourceExtension,
    processAndUploadAssetsCommand,
} from '@backtrace/sourcemap-tools';
import path from 'path';
import { LogLevel, Plugin } from 'rollup';

export function BacktracePlugin(options?: BacktracePluginOptions): Plugin {
    return {
        name: 'backtrace',
        async writeBundle(outputOptions, bundle) {
            const logWithPrefix = (level: LogLevel) => (message: string) => this[level](`Backtrace: ${message}`);
            const info = logWithPrefix('info');
            const debug = logWithPrefix('debug');

            const processAndUpload = processAndUploadAssetsCommand(options ?? {}, {
                beforeAll: (assets) => info(`processing ${assets.length} files`),

                afterProcess: (asset) => debug(`[${asset.asset.name}] processed source and sourcemap`),
                afterWrite: (asset) => debug(`[${asset.asset.name}] wrote source and sourcemap to file`),
                assetFinished: (asset) => info(`[${asset.asset.name}] asset processed successfully`),
                assetError: (asset) => this.warn(`[${asset.asset.name}] ${asset.error}`),

                beforeArchive: (paths) => this.debug(`creating archive to upload from ${paths.length} files`),
                beforeUpload: () => info(`uploading sourcemaps...`),
                afterUpload: (result) => info(`sourcemaps uploaded to Backtrace: ${result.rxid}`),
                uploadError: (error) => this.warn(`failed to upload sourcemaps: ${error}`),
            });

            const outputDir = outputOptions.dir;
            if (!outputDir) {
                this.warn('output dir not set, cannot continue');
                return;
            }

            const assets = Object.keys(bundle)
                .filter(matchSourceExtension)
                .map<Asset>((asset) => ({ name: asset, path: path.join(outputDir, asset) }));

            await processAndUpload(assets);
        },
    };
}
