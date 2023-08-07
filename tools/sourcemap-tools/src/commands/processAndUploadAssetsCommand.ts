import { DebugIdGenerator } from '../DebugIdGenerator';
import { SourceProcessor } from '../SourceProcessor';
import { SymbolUploader, SymbolUploaderOptions, UploadResult } from '../SymbolUploader';
import { ZipArchive } from '../ZipArchive';
import { inspect, pass } from '../helpers/common';
import { Asset } from '../models/Asset';
import { AsyncResult } from '../models/AsyncResult';
import { ProcessAssetError, ProcessAssetResult } from '../models/ProcessAssetResult';
import { Result, flatMap, isErr } from '../models/Result';
import { archiveSourceMaps } from './archiveSourceMaps';
import { processAsset } from './processAsset';
import { uploadArchive } from './uploadArchive';
import { writeAsset } from './writeAsset';

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
    readonly uploadOptions?: SymbolUploaderOptions;
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
    beforeArchive?(paths: string[]): void;
    afterArchive?(archive: ZipArchive): void;
    beforeUpload?(archive: ZipArchive): void;
    afterUpload?(result: UploadResult): void;
    assetError?(error: ProcessAssetError): void;
    uploadError?(error: string): void;
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

        const sourceMapPaths = assetsResult.data.map((r) => r.result.sourceMapPath);
        const uploadResult = await AsyncResult.fromValue<string[], string>(sourceMapPaths)
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
