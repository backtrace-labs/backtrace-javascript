import {
    Asset,
    AssetWithContent,
    Err,
    Ok,
    R,
    RawSourceMap,
    ResultPromise,
    SourceAndSourceMap,
    SourceProcessor,
    loadSourceMap,
    parseJSON,
    pipe,
    readFile,
    writeFile,
} from '@backtrace-labs/sourcemap-tools';
import fs from 'fs';

export function toAsset(file: string): Asset {
    return { name: file, path: file };
}

export async function pathIfExists(file: string): Promise<string | undefined> {
    try {
        await fs.promises.stat(file);
        return file;
    } catch (err) {
        return undefined;
    }
}

export function readSource<T extends Asset>(asset: T): ResultPromise<AssetWithContent<string>, string> {
    return pipe(
        asset.path,
        readFile,
        R.map((content) => ({ ...asset, content })),
    );
}

export function readSourceMap<T extends Asset>(asset: T): ResultPromise<AssetWithContent<RawSourceMap>, string> {
    return pipe(
        asset.path,
        readFile,
        R.map(parseJSON<RawSourceMap>),
        R.map((content) => ({ ...asset, content })),
    );
}

export function readSourceAndSourceMap(sourceProcessor: SourceProcessor) {
    return function _readSourceAndSourceMap(sourceAsset: Asset): ResultPromise<SourceAndSourceMap, string> {
        return pipe(
            sourceAsset,
            readSource,
            R.map((source) =>
                pipe(
                    source.content,
                    (content) => sourceProcessor.getSourceMapPathFromSource(content, sourceAsset.path),
                    R.map((result) => result ?? pathIfExists(`${source.path}.map`)),
                    R.map((path) => (path ? Ok(path) : Err('could not find source map for source'))),
                    R.map((path) => ({ name: path, path } as Asset)),
                    R.map(readSourceMap),
                    R.map((sourceMap) => ({ source, sourceMap } as SourceAndSourceMap)),
                ),
            ),
        );
    };
}

export function writeAsset<T extends AssetWithContent<unknown>>(asset: T) {
    return pipe(
        asset.content,
        (content) => (typeof content === 'object' ? JSON.stringify(content) : String(content)),
        writeFile(asset.path),
        R.map(() => asset),
    );
}

export function writeSourceAndSourceMap<T extends SourceAndSourceMap>(asset: T) {
    return pipe(
        asset,
        () => pipe(asset.source.content, writeFile(asset.source.path)),
        R.map(() => pipe(JSON.stringify(asset.sourceMap.content), writeFile(asset.sourceMap.path))),
        R.map(() => asset),
    );
}

export function readSourceMapFromPathOrFromSource(sourceProcessor: SourceProcessor) {
    return function readSourceMapFromPathOrFromSource(asset: Asset) {
        return pipe(
            asset,
            loadSourceMap,
            R.mapErr(() => pipe(asset, resolveSourceMapPath(sourceProcessor), R.map(loadSourceMap))),
        );
    };
}

function resolveSourceMapPath(sourceProcessor: SourceProcessor) {
    return function resolveSourceMapFromSource(asset: Asset) {
        return pipe(
            asset.path,
            (path) => sourceProcessor.getSourceMapPathFromSourceFile(path),
            R.map((result) => result ?? pathIfExists(`${asset.path}.map`)),
            R.map((path) => (path ? Ok(path) : Err('could not find source map for source'))),
            R.map((path) => ({
                ...asset,
                name: path,
                path,
            })),
            R.mapErr((err) => `file is not a sourcemap and sourcemap search failed: ${err}`),
        );
    };
}

export function validateUrl(url: string) {
    try {
        new URL(url);
        return Ok(url);
    } catch {
        return Err(`invalid URL: ${url}`);
    }
}

export function isAssetProcessed(sourceProcessor: SourceProcessor) {
    return function isAssetProcessed(asset: AssetWithContent<RawSourceMap>) {
        const result = sourceProcessor.isSourceMapProcessed(asset.content);
        return { asset, result } as const;
    };
}

export function uniqueBy<T, U>(fn: (t: T) => U) {
    return function uniqueBy(array: T[]): T[] {
        const keys = new Set<U>();
        return array.filter((t) => {
            const key = fn(t);
            if (keys.has(key)) {
                return false;
            }
            keys.add(key);
            return true;
        });
    };
}
