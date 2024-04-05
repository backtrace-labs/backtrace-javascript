import {
    Asset,
    AssetWithContent,
    DebugMetadata,
    Err,
    loadSourceMap,
    Ok,
    parseJSON,
    pipe,
    R,
    RawSourceMap,
    readFile,
    ResultPromise,
    SourceAndSourceMap,
    SourceProcessor,
    stripSourcesContent,
    writeFile,
} from '@backtrace/sourcemap-tools';
import fs from 'fs';
import { CliLogger } from '../logger';
import { SourceAndOptionalSourceMap, SourceAndOptionalSourceMapPaths } from '../models/Asset';
import { FindFileTuple } from './find';

export function toAsset(file: string): Asset {
    return { name: file, path: file };
}

export function toSourceAndSourceMapPaths(tuple: FindFileTuple): SourceAndOptionalSourceMapPaths {
    return {
        source: toAsset(tuple.file1.path),
        sourceMap: tuple.file2 ? toAsset(tuple.file2) : undefined,
    };
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
    return async function _readSourceAndSourceMap({
        source,
        sourceMap,
    }: SourceAndOptionalSourceMapPaths): ResultPromise<SourceAndOptionalSourceMap, string> {
        const sourceResult = await readSource(source);
        if (sourceResult.isErr()) {
            return sourceResult;
        }

        const loadedSource = sourceResult.data;

        const sourceMapResult = sourceMap
            ? await readSourceMap(sourceMap)
            : await pipe(
                  loadedSource,
                  ({ content }) => sourceProcessor.getSourceMapPathFromSource(content, source.path),
                  (result) => result ?? pathIfExists(`${source.path}.map`),
                  async (path) => (path ? await pipe(path, toAsset, readSourceMap) : Ok(undefined)),
              );

        if (sourceMapResult.isErr()) {
            return sourceMapResult;
        }

        return Ok({ source: loadedSource, sourceMap: sourceMapResult.data });
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

export function writeSourceAndOptionalSourceMap<T extends SourceAndOptionalSourceMap>(asset: T) {
    return pipe(
        asset,
        () => pipe(asset.source.content, writeFile(asset.source.path)),
        R.map(async () =>
            asset.sourceMap ? await pipe(JSON.stringify(asset.sourceMap.content), writeFile(asset.sourceMap.path)) : Ok,
        ),
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

export function loadAssetsDebugId(sourceProcessor: SourceProcessor) {
    return function loadAssetsDebugId<T extends SourceAndOptionalSourceMap>(
        asset: T & Partial<DebugMetadata>,
    ): T & Partial<DebugMetadata> {
        if (asset.debugId) {
            return asset;
        }

        const sourceDebugMetadata = sourceProcessor.getSourceDebugMetadata(asset.source.content);
        const sourceDebugId = sourceDebugMetadata?.debugId;
        const sourceSymbolicationSource = sourceDebugMetadata?.symbolicationSource;

        const sourceMapDebugId = asset.sourceMap
            ? sourceProcessor.getSourceMapDebugId(asset.sourceMap.content)
            : undefined;

        if (sourceMapDebugId && sourceDebugId !== sourceMapDebugId) {
            return asset;
        }

        const debugId = sourceDebugId ?? sourceMapDebugId;
        return { ...asset, debugId, symbolicationSource: sourceSymbolicationSource };
    };
}

export function stripSourcesFromAssets<T extends SourceAndOptionalSourceMap>(assets: T): T {
    if (assets.sourceMap) {
        return {
            ...assets,
            sourceMap: stripSourcesContent(assets.sourceMap),
        };
    }

    return assets;
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

export function printAssetInfo(logger: CliLogger) {
    return function printAssetInfo<T extends SourceAndOptionalSourceMap>(asset: T) {
        logger.debug(`${asset.source.path}`);
        logger.debug(`└── ${asset.sourceMap?.path ?? '<no sourcemap>'}`);
        return asset;
    };
}
