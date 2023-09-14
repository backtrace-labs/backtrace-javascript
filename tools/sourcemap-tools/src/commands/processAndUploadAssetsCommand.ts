import path from 'path';
import { RawSourceMap } from 'source-map';
import { DebugIdGenerator } from '../DebugIdGenerator';
import { SourceProcessor } from '../SourceProcessor';
import { SymbolUploader, SymbolUploaderOptions, UploadResult } from '../SymbolUploader';
import { inspect, mapAsync, pass } from '../helpers/common';
import { flow, pipe } from '../helpers/flow';
import { Asset, AssetWithContent } from '../models/Asset';
import { ProcessAssetError, ProcessAssetResult } from '../models/ProcessAssetResult';
import { R, Result } from '../models/Result';
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
                    R.mapErr(options?.assetError ? inspect(options.assetError) : pass),
                ),
            ),
        );

        const assetsResult = R.flatMap(assetResults);
        if (assetsResult.isErr()) {
            const result: ProcessResult = { assetResults };
            options?.afterAll && options.afterAll(result);
            return result;
        }

        if (!uploadCommand) {
            const result: ProcessResult = { assetResults };
            options?.afterAll && options.afterAll(result);
            return result;
        }

        const sourceMapAssets = assetsResult.data.map<Asset>((r) => ({
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
