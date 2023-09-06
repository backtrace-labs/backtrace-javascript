import {
    Asset,
    AssetWithContent,
    AsyncResult,
    ResultPromise,
    SourceProcessor,
    loadSourceMap,
    readFile,
} from '@backtrace-labs/sourcemap-tools';

export function toAsset(file: string): Asset {
    return { name: file, path: file };
}

export function readAsset(asset: Asset): ResultPromise<AssetWithContent<string>, string> {
    return AsyncResult.equip(readFile(asset.path)).then((content) => ({ ...asset, content })).inner;
}

export function loadSourceMapFromPathOrFromSource(sourceProcessor: SourceProcessor) {
    return function loadSourceMapFromPathOrFromSource(asset: Asset) {
        return AsyncResult.fromValue<Asset, string>(asset)
            .then(loadSourceMap)
            .thenErr(
                () =>
                    AsyncResult.fromValue<Asset, string>(asset)
                        .then(resolveSourceMapPathFromSource(sourceProcessor))
                        .then(loadSourceMap).inner,
            ).inner;
    };
}

function resolveSourceMapPathFromSource(sourceProcessor: SourceProcessor) {
    return function resolveSourceMapFromSource(asset: Asset) {
        return AsyncResult.equip(sourceProcessor.getSourceMapPathFromSourceFile(asset.path))
            .then<Asset>((path) => ({
                ...asset,
                name: path,
                path,
            }))
            .thenErr((err) => `file is not a sourcemap, and sourcemap search failed: ${err}`).inner;
    };
}
