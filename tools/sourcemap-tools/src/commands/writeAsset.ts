import { writeFile } from '../helpers/common';
import { pipe } from '../helpers/flow';
import { ProcessAssetError, ProcessAssetResult } from '../models/ProcessAssetResult';
import { R, ResultPromise } from '../models/Result';

export function writeAsset(result: ProcessAssetResult): ResultPromise<ProcessAssetResult, ProcessAssetError> {
    return pipe(
        result,
        (result) =>
            pipe(
                result.result.source,
                writeFile(result.result.sourcePath),
                R.map(() => result),
            ),
        R.map((result) =>
            pipe(
                JSON.stringify(result.result.sourceMap),
                writeFile(result.result.sourceMapPath),
                R.map(() => result),
            ),
        ),
        R.mapErr((error) => ({ asset: result.asset, error })),
    );
}
