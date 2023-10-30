import { RawSourceMap, RawSourceMapWithDebugId } from './RawSourceMap';

export interface SourceAndSourceMap {
    readonly source: AssetWithContent<string>;
    readonly sourceMap: AssetWithContent<RawSourceMap>;
}

export interface ProcessedSourceAndSourceMap {
    readonly source: AssetWithContent<string>;
    readonly sourceMap: AssetWithContent<RawSourceMapWithDebugId>;
    readonly debugId: string;
}

export interface Asset {
    readonly name: string;
    readonly path: string;
}

export interface AssetWithContent<T> extends Asset {
    readonly content: T;
}

export interface AssetWithDebugId extends Asset {
    readonly debugId: string;
}
