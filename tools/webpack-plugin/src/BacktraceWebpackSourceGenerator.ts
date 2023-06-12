import { DebugIdGenerator } from '@backtrace/sourcemap-tools';
import type { Source } from 'webpack-sources';
import { ConcatSource, RawSource, SourceMapSource } from 'webpack-sources';

export class BacktraceWebpackSourceGenerator {
    constructor(private readonly _debugIdGenerator: DebugIdGenerator) {}

    public addDebugIdToSource(source: Source, debugId: string): ConcatSource {
        const sourceSnippet = this._debugIdGenerator.generateSourceSnippet(debugId);
        return new ConcatSource(source, sourceSnippet);
    }

    public addDebugIdCommentToSource(source: Source, debugId: string): ConcatSource {
        const comment = this._debugIdGenerator.generateSourceComment(debugId);
        return new ConcatSource(source, comment);
    }

    public addDebugIdToSourceMap(sourceMapSource: SourceMapSource, debugId: string): SourceMapSource {
        const { source, map } = sourceMapSource.sourceAndMap();
        if (!map) {
            return sourceMapSource;
        }

        const newMap = this._debugIdGenerator.addSourceMapKey(map, debugId);

        // The file name does not matter at this point, and it is set to 'x' in Webpack
        return new SourceMapSource(source as string, 'x', newMap as never);
    }

    public addDebugIdToRawSourceMap(source: Source, debugId: string): RawSource {
        let sourceMapSource = (source.source() as Buffer).toString('utf8');
        const debugSourceMapObj = this._debugIdGenerator.addSourceMapKey({}, debugId);
        for (const [key, value] of Object.entries(debugSourceMapObj)) {
            // Replace closing bracket with additional key-values
            // Keep the matched whitespaces at the end
            sourceMapSource = sourceMapSource.replace(/}(\s*)$/, `,"${key}":${JSON.stringify(value)}}$1`);
        }

        return new RawSource(sourceMapSource);
    }
}
