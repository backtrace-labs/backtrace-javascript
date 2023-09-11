export interface RawSourceMap {
    version: number;
    sources: string[];
    names: string[];
    sourceRoot?: string;
    sourcesContent?: string[];
    mappings: string;
    file: string;
}

export interface RawSourceMapWithDebugId extends RawSourceMap {
    readonly debugId: string;
}
