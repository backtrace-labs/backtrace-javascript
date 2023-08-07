import { writeFile } from '../helpers/common';
import { AsyncResult } from '../models/AsyncResult';
import { ProcessAssetError, ProcessAssetResult } from '../models/ProcessAssetResult';

export function writeAsset(result: ProcessAssetResult) {
    const { source, sourcePath: path, sourceMap, sourceMapPath } = result.result;

    return AsyncResult.equip(writeFile([source, path]))
        .then(() => writeFile([JSON.stringify(sourceMap), sourceMapPath]))
        .then(() => result)
        .thenErr<ProcessAssetError>((error) => ({ asset: result.asset, error })).inner;
}
