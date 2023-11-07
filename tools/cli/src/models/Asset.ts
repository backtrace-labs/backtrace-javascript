import { Asset } from '@backtrace/sourcemap-tools';

export interface SourceAndSourceMapPaths {
    readonly source: Asset;
    readonly sourceMap?: Asset;
}
