import {
    Asset,
    AssetWithContent,
    DebugMetadata,
    RawSourceMap,
    RawSourceMapWithDebugId,
} from '@backtrace/sourcemap-tools';

export interface SourceAndOptionalSourceMapPaths {
    readonly source: Asset;
    readonly sourceMap?: Asset;
}

export interface SourceAndOptionalSourceMap {
    readonly source: AssetWithContent<string>;
    readonly sourceMap?: AssetWithContent<RawSourceMap>;
}

export interface ProcessedSourceAndOptionalSourceMap extends DebugMetadata {
    readonly source: AssetWithContent<string>;
    readonly sourceMap?: AssetWithContent<RawSourceMapWithDebugId>;
}
