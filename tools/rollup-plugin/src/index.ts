import {
    DebugIdGenerator,
    SourceProcessor,
    SymbolUploader,
    SymbolUploaderOptions,
    ZipArchive,
} from '@backtrace/sourcemap-tools';
import fs from 'fs';
import path from 'path';
import { Plugin } from 'rollup';

export interface BacktracePluginOptions {
    /**
     * Upload URL for uploading sourcemap files.
     * See Source Maps Integration Guide for your instance for more information.
     *
     * If not set, the sourcemaps will not be uploaded. The sources will be still processed and ready for manual upload.
     */
    uploadUrl?: string | URL;

    /**
     * Additional upload options.
     */
    uploadOptions?: SymbolUploaderOptions;
}

export function BacktracePlugin(options?: BacktracePluginOptions): Plugin {
    const sourceProcessor = new SourceProcessor(new DebugIdGenerator());
    const sourceMapUploader = options?.uploadUrl
        ? new SymbolUploader(options.uploadUrl, options.uploadOptions)
        : undefined;

    return {
        name: 'backtrace',
        async writeBundle(options, bundle) {
            const processResults = new Map<string, string | Error>();
            let uploadResult: string | Error | undefined;

            const outputDir = options.dir;
            if (!outputDir) {
                this.info('output dir not set');
                return;
            }

            const entries: [string, string, string][] = [];

            for (const asset in bundle) {
                if (!asset.match(/\.(c|m)?jsx?$/)) {
                    this.debug(`[${asset}] skipping processing, extension does not match`);
                    continue;
                }

                const map = asset + '.map';
                if (!bundle[map]) {
                    this.debug(`[${asset}] skipping processing, map file not found`);
                    continue;
                }

                const assetPath = path.join(outputDir, asset);
                const sourceMapPath = path.join(outputDir, map);

                this.debug(`adding asset ${assetPath} with sourcemap ${sourceMapPath}`);
                entries.push([asset, assetPath, sourceMapPath]);
            }

            this.info(`received ${entries.length} files for processing`);

            for (const [asset, sourcePath, sourceMapPath] of entries) {
                let debugId: string;

                this.debug(`[${asset}] processing source and sourcemap`);
                try {
                    const result = await sourceProcessor.processSourceAndSourceMapFiles(sourcePath, sourceMapPath);

                    if (result.isErr()) {
                        this.warn(`[${asset}] process source and sourcemap failed: ${result.data}`);
                        processResults.set(asset, new Error(result.data));
                        continue;
                    }

                    debugId = result.data.debugId;
                    await fs.promises.writeFile(sourcePath, result.data.source, 'utf8');
                    await fs.promises.writeFile(sourceMapPath, JSON.stringify(result.data.sourceMap), 'utf8');

                    processResults.set(asset, debugId);
                } catch (err) {
                    this.warn(`[${asset}] process source and sourcemap failed: ${err}`);
                    processResults.set(asset, err instanceof Error ? err : new Error('Unknown error.'));
                    continue;
                }
            }

            if (sourceMapUploader) {
                this.info(`uploading sourcemaps`);
                try {
                    const archive = new ZipArchive();
                    const request = sourceMapUploader.uploadSymbol(archive);

                    for (const [asset, _, sourceMapPath] of entries) {
                        const stream = fs.createReadStream(sourceMapPath);
                        archive.append(`${asset}.map`, stream);
                    }

                    await archive.finalize();
                    const result = await request;
                    if (result.isErr()) {
                        this.warn(`upload sourcemaps failed: ${result.data}`);
                        uploadResult = new Error(result.data);
                    } else {
                        uploadResult = result.data.rxid;
                    }
                } catch (err) {
                    this.warn(`upload sourcemaps failed: ${err}`);
                    uploadResult = err instanceof Error ? err : new Error('Unknown error.');
                }
            }

            for (const [key, result] of processResults) {
                if (typeof result === 'string') {
                    this.info(`[${key}] processed file successfully`);
                    this.debug(`\tdebugId: ${result}`);
                } else {
                    this.warn(`[${key}] failed to process file: ${result.message}`);
                    this.debug(`Error stack trace: ${result.stack}`);
                }
            }

            if (uploadResult) {
                if (typeof uploadResult === 'string') {
                    this.info(`uploaded sourcemaps successfully`);
                    this.debug(`\trxid: ${uploadResult}`);
                } else {
                    this.warn(`failed to upload sourcemaps: ${uploadResult.message}`);
                    this.debug(`Error stack trace: ${uploadResult.stack}`);
                }
            }
        },
        onLog(level, log) {
            // Prefix info and debug logs by "Backtrace: "
            if (level === 'info' || level === 'debug') {
                this[level]({ ...log, message: `Backtrace: ${log.message}` });
                return false;
            }
        },
    };
}
