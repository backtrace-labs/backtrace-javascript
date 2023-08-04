import { RawSourceMap } from 'source-map';
import { parseJSON, readFile } from '../helpers/common';
import { Asset, AssetWithContent } from '../models/Asset';
import { AsyncResult } from '../models/AsyncResult';

export function loadSourceMap(asset: Asset) {
    return AsyncResult.fromValue<string, string>(asset.path)
        .then(readFile)
        .then(parseJSON<RawSourceMap>)
        .then<AssetWithContent<RawSourceMap>>((content) => ({ ...asset, content })).inner;
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
