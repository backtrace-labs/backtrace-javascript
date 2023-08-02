import { ProcessResultWithPaths } from '../SourceProcessor';
import { Asset } from './Asset';

export interface ProcessAssetResult {
    readonly asset: Asset;
    readonly result: ProcessResultWithPaths;
}

export interface ProcessAssetError {
    readonly asset: Asset;
    readonly error: string;
}
