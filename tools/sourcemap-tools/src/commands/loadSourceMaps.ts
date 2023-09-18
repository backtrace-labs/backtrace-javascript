import { RawSourceMap } from 'source-map';
import { parseJSON, readFile } from '../helpers/common';
import { pipe } from '../helpers/flow';
import { Asset, AssetWithContent } from '../models/Asset';
import { R } from '../models/Result';

export function loadSourceMap(asset: Asset) {
    return pipe(
        asset.path,
        readFile,
        R.map(parseJSON<RawSourceMap>),
        R.map((content) => ({ ...asset, content })),
    );
}

export function stripSourcesContent(asset: AssetWithContent<RawSourceMap>): AssetWithContent<RawSourceMap> {
    return {
        ...asset,
        content: {
            ...asset.content,
            sourcesContent: undefined,
        },
    };
}
