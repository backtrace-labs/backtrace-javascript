import path from 'path';
import { RawSourceMap } from 'source-map';
import { DebugIdGenerator } from '../DebugIdGenerator';
import { SourceProcessor } from '../SourceProcessor';
import { SymbolUploader, SymbolUploaderOptions, UploadResult } from '../SymbolUploader';
import { inspect, mapAsync, pass } from '../helpers/common';
import { flow, pipe } from '../helpers/flow';
import { Asset, AssetWithContent } from '../models/Asset';
import { ProcessAssetError, ProcessAssetResult } from '../models/ProcessAssetResult';
import { R, Result, ResultOk } from '../models/Result';
import { createArchive, finalizeArchive } from './archiveSourceMaps';
import { loadSourceMap, stripSourcesContent } from './loadSourceMaps';
import { processAsset } from './processAsset';
import { uploadArchive } from './uploadArchive';
import { writeAsset } from './writeAsset';

interface BacktracePluginUploadOptions {
    /**
     * By default, `sourcesContent` in sourcemaps will not be uploaded to Backtrace, even if available in the sourcemap.
     * Set this to `true` to upload sourcemaps with `sourcesContent` if available.
     */
    readonly includeSources: boolean;
}

/**
 * Determines what happens when an individual asset fails to process.
 *
 * - `'exit'` — abort the entire process and upload (default).
 * - `'skip'` — silently skip the failed asset; successfully processed assets are still uploaded.
 * - `'warn'` — log the failure via the `assetError` callback and continue uploading the rest.
 */
export type AssetErrorBehavior = 'exit' | 'skip' | 'warn';

export interface BacktracePluginOptions {
    /**
     * Upload URL for uploading sourcemap files.
     * See Source Maps Integration Guide for your instance for more information.
     *
     * If not set, the sourcemaps will not be uploaded. The sources will be still processed and ready for manual upload.
     */
    readonly uploadUrl?: string | URL;

    /**
     * Additional upload options.
     */
    readonly uploadOptions?: SymbolUploaderOptions & BacktracePluginUploadOptions;

    /**
     * What to do when an individual asset fails to process (e.g. a missing sourcemap file).
     *
     * - `'warn'` — report the failure via the `assetError` callback and continue uploading the rest. (default)
     * - `'skip'` — silently skip the failed asset. Successfully processed assets are still uploaded.
     * - `'exit'` — abort the entire process and upload. No sourcemaps will be uploaded.
     *
     * @default 'warn'
     */
    readonly assetErrorBehavior?: AssetErrorBehavior;
}

interface ProcessResult {
    readonly assetResults: Result<ProcessAssetResult, ProcessAssetError>[];
    readonly uploadResult?: Result<UploadResult, string>;
}

export interface ProcessAndUploadAssetsCommandOptions {
    beforeAll?(assets: Asset[]): unknown;
    afterAll?(result: ProcessResult): unknown;
    beforeProcess?(asset: Asset): unknown;
    afterProcess?(asset: ProcessAssetResult): unknown;
    beforeWrite?(asset: ProcessAssetResult): unknown;
    afterWrite?(asset: ProcessAssetResult): unknown;
    assetFinished?(asset: ProcessAssetResult): unknown;
    beforeLoad?(asset: Asset): unknown;
    afterLoad?(asset: AssetWithContent<RawSourceMap>): unknown;
    beforeUpload?(assets: AssetWithContent<RawSourceMap>[]): unknown;
    afterUpload?(result: UploadResult): unknown;
    assetError?(error: ProcessAssetError): unknown;
    assetSkipped?(error: ProcessAssetError): unknown;
    processingSummary?(message: string): unknown;
    uploadError?(error: string): unknown;
}

export function processAndUploadAssetsCommand(
    pluginOptions: BacktracePluginOptions,
    options?: ProcessAndUploadAssetsCommandOptions,
) {
    const sourceProcessor = new SourceProcessor(new DebugIdGenerator());
    const sourceMapUploader = pluginOptions?.uploadUrl
        ? new SymbolUploader(pluginOptions.uploadUrl, pluginOptions.uploadOptions)
        : undefined;

    const processCommand = processAsset(sourceProcessor);
    const uploadCommand = sourceMapUploader ? uploadArchive(sourceMapUploader) : undefined;

    return async function processAndUploadAssets(assets: Asset[]): Promise<ProcessResult> {
        options?.beforeAll && options.beforeAll(assets);

        const assetResults = await Promise.all(
            assets.map((asset) =>
                pipe(
                    asset,
                    options?.beforeProcess ? inspect(options.beforeProcess) : pass,
                    processCommand,
                    R.map(options?.afterProcess ? inspect(options.afterProcess) : pass),
                    R.map(options?.beforeWrite ? inspect(options.beforeWrite) : pass),
                    R.map(writeAsset),
                    R.map(options?.afterWrite ? inspect(options.afterWrite) : pass),
                    R.map(options?.assetFinished ? inspect(options.assetFinished) : pass),
                ),
            ),
        );

        const assetErrorBehavior = pluginOptions.assetErrorBehavior ?? 'warn';
        const failedAssets = assetResults.filter((r) => r.isErr());
        const successfulAssets = assetResults.filter((r): r is ResultOk<ProcessAssetResult> => r.isOk());

        if (failedAssets.length > 0) {
            const summary =
                `${failedAssets.length} of ${assets.length} asset(s) failed to process, ` +
                `${successfulAssets.length} succeeded`;

            switch (assetErrorBehavior) {
                case 'exit':
                    // Report each failure via assetError, then throw to fail the build.
                    for (const failed of failedAssets) {
                        if (failed.isErr()) {
                            options?.assetError && options.assetError(failed.data);
                        }
                    }
                    options?.afterAll && options.afterAll({ assetResults });
                    throw new Error(
                        `Backtrace: ${summary}. ` +
                            `Upload aborted. Set assetErrorBehavior to 'skip' or 'warn' to upload the remaining assets.`,
                    );

                case 'warn':
                    // Report each failure via assetError and continue uploading the rest.
                    for (const failed of failedAssets) {
                        if (failed.isErr()) {
                            options?.assetError && options.assetError(failed.data);
                        }
                    }
                    options?.processingSummary &&
                        options.processingSummary(
                            `${summary}. Continuing with ${successfulAssets.length} successfully processed asset(s).`,
                        );
                    break;

                case 'skip':
                    // Silently skip — report via assetSkipped (not assetError).
                    for (const failed of failedAssets) {
                        if (failed.isErr()) {
                            options?.assetSkipped && options.assetSkipped(failed.data);
                        }
                    }
                    options?.processingSummary &&
                        options.processingSummary(
                            `${summary}. Skipped failed asset(s), continuing with ${successfulAssets.length} successfully processed asset(s).`,
                        );
                    break;
            }
        }

        if (!uploadCommand || successfulAssets.length === 0) {
            const result: ProcessResult = { assetResults };
            options?.afterAll && options.afterAll(result);
            return result;
        }

        const sourceMapAssets = successfulAssets
            .map((r) => r.data)
            .map<Asset>((r) => ({
                name: path.basename(r.result.sourceMapPath),
                path: r.result.sourceMapPath,
            }));

        const includeSources = pluginOptions?.uploadOptions?.includeSources;

        const uploadResult = await pipe(
            sourceMapAssets,
            flow(
                mapAsync(
                    flow(
                        options?.beforeLoad ? inspect(options?.beforeLoad) : pass,
                        loadSourceMap,
                        R.map(options?.afterLoad ? inspect(options?.afterLoad) : pass),
                        R.map(includeSources ? pass : stripSourcesContent),
                    ),
                ),
                R.flatMap,
            ),
            R.map(options?.beforeUpload ? inspect(options.beforeUpload) : pass),
            R.map(createArchive(sourceProcessor)),
            R.map(async ({ assets, archive }) => {
                // We first create the upload request, which pipes the archive to itself
                const promise = uploadCommand(archive);

                // Next we finalize the archive, which causes the assets to be written to the archive, and consequently to the request
                await finalizeArchive({ assets, archive });

                // Finally, we return the upload request promise
                return promise;
            }),
            R.map(options?.afterUpload ? inspect(options.afterUpload) : pass),
            R.mapErr(options?.uploadError ? inspect(options.uploadError) : pass),
        );

        const result: ProcessResult = { assetResults, uploadResult };
        options?.afterAll && options.afterAll(result);
        return result;
    };
}
