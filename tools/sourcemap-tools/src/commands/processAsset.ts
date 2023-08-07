import { SourceProcessor } from '../SourceProcessor';
import { Asset } from '../models/Asset';
import { AsyncResult } from '../models/AsyncResult';
import { ProcessAssetError, ProcessAssetResult } from '../models/ProcessAssetResult';
import { Result } from '../models/Result';

export function processAsset(sourceProcessor: SourceProcessor) {
    return function processAsset(asset: Asset): Promise<Result<ProcessAssetResult, ProcessAssetError>> {
        return AsyncResult.equip(sourceProcessor.processSourceAndSourceMapFiles(asset.path))
            .then<ProcessAssetResult>((result) => ({ asset, result }))
            .thenErr<ProcessAssetError>((error) => ({ asset, error })).inner;
    };
}
