import { SourceProcessor } from '../SourceProcessor';
import { pipe } from '../helpers/flow';
import { Asset } from '../models/Asset';
import { ProcessAssetError, ProcessAssetResult } from '../models/ProcessAssetResult';
import { R, Result } from '../models/Result';

export function processAsset(sourceProcessor: SourceProcessor) {
    return function processAsset(asset: Asset): Promise<Result<ProcessAssetResult, ProcessAssetError>> {
        return pipe(
            asset.path,
            (path) => sourceProcessor.processSourceAndSourceMapFiles(path),
            R.map((result) => ({ asset, result })),
            R.mapErr((error) => ({ asset, error })),
        );
    };
}
