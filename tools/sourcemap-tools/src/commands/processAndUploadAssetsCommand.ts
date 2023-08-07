import path from 'path';
import { RawSourceMap } from 'source-map';
import { DebugIdGenerator } from '../DebugIdGenerator';
import { SourceProcessor } from '../SourceProcessor';
import { SymbolUploader, SymbolUploaderOptions, UploadResult } from '../SymbolUploader';
import { ZipArchive } from '../ZipArchive';
import { inspect, map, pass } from '../helpers/common';
import { Asset, AssetWithContent } from '../models/Asset';
import { AsyncResult } from '../models/AsyncResult';
import { ProcessAssetError, ProcessAssetResult } from '../models/ProcessAssetResult';
import { Result, flatMap, isErr } from '../models/Result';
import { archiveSourceMaps } from './archiveSourceMaps';
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
    beforeArchive?(assets: AssetWithContent<RawSourceMap>[]): unknown;
    afterArchive?(archive: ZipArchive): unknown;
    beforeUpload?(archive: ZipArchive): unknown;
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
    const archiveCommand = archiveSourceMaps(sourceProcessor);
    const uploadCommand = sourceMapUploader ? uploadArchive(sourceMapUploader) : undefined;

    return async function processAndUploadAssets(assets: Asset[]): Promise<ProcessResult> {
        options?.beforeAll && options.beforeAll(assets);

        const assetResults = await Promise.all(
            assets.map(
                (asset) =>
                    AsyncResult.fromValue<Asset, ProcessAssetError>(asset)
                        .then(options?.beforeProcess ? inspect(options.beforeProcess) : pass)
                        .then(processCommand)
                        .then(options?.afterProcess ? inspect(options.afterProcess) : pass)
                        .then(options?.beforeWrite ? inspect(options.beforeWrite) : pass)
                        .then(writeAsset)
                        .then(options?.afterWrite ? inspect(options.afterWrite) : pass)
                        .then(options?.assetFinished ? inspect(options.assetFinished) : pass)
                        .thenErr(options?.assetError ? inspect(options.assetError) : pass).inner,
            ),
        );

        const assetsResult = flatMap(assetResults);
        if (isErr(assetsResult)) {
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

        const uploadResult = await AsyncResult.fromValue<Asset[], string>(sourceMapAssets)
            .then(
                map(
                    (asset) =>
                        AsyncResult.fromValue<Asset, string>(asset)
                            .then(options?.beforeLoad ? inspect(options?.beforeLoad) : pass)
                            .then(loadSourceMap)
                            .then(options?.afterLoad ? inspect(options?.afterLoad) : pass)
                            .then(includeSources ? pass : stripSourcesContent).inner,
                ),
            )
            .then(options?.beforeArchive ? inspect(options.beforeArchive) : pass)
            .then(archiveCommand)
            .then(options?.afterArchive ? inspect(options.afterArchive) : pass)
            .then(options?.beforeUpload ? inspect(options.beforeUpload) : pass)
            .then(uploadCommand)
            .then(options?.afterUpload ? inspect(options.afterUpload) : pass)
            .thenErr(options?.uploadError ? inspect(options.uploadError) : pass).inner;

        const result: ProcessResult = { assetResults, uploadResult };
        options?.afterAll && options.afterAll(result);
        return result;
    };
}
