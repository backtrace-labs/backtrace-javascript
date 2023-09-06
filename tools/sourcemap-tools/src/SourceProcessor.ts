import path from 'path';
import { RawSourceMap } from 'source-map';
import { DebugIdGenerator } from './DebugIdGenerator';
import { parseJSON, readFile } from './helpers/common';
import { appendBeforeWhitespaces } from './helpers/stringHelpers';
import { stringToUuid } from './helpers/stringToUuid';
import { AsyncResult, ResultPromise } from './models/AsyncResult';
import { Err, Ok, Result } from './models/Result';

export interface ProcessResult {
    readonly debugId: string;
    readonly source: string;
    readonly sourceMap: RawSourceMap;
}

export interface ProcessResultWithPaths extends ProcessResult {
    readonly sourcePath: string;
    readonly sourceMapPath: string;
}

export class SourceProcessor {
    constructor(private readonly _debugIdGenerator: DebugIdGenerator) {}

    public isSourceProcessed(source: string): boolean {
        return !!this._debugIdGenerator.getSourceDebugId(source);
    }

    public isSourceMapProcessed(sourceMap: RawSourceMap): boolean {
        return !!this._debugIdGenerator.getSourceMapDebugId(sourceMap);
    }

    public async isSourceFileProcessed(sourcePath: string): ResultPromise<boolean, string> {
        return AsyncResult.equip(readFile(sourcePath)).then((v) => this.isSourceProcessed(v)).inner;
    }

    public async isSourceMapFileProcessed(sourceMapPath: string): ResultPromise<boolean, string> {
        return AsyncResult.equip(readFile(sourceMapPath))
            .then(parseJSON<RawSourceMap>)
            .then((v) => this.isSourceMapProcessed(v)).inner;
    }

    public getSourceMapDebugId(sourceMap: RawSourceMap): Result<string, string> {
        const debugId = this._debugIdGenerator.getSourceMapDebugId(sourceMap);
        if (!debugId) {
            return Err('sourcemap does not have a debug ID');
        }

        return Ok(debugId);
    }

    public async getSourceMapFileDebugId(sourceMapPath: string): ResultPromise<string, string> {
        return AsyncResult.equip(readFile(sourceMapPath))
            .then(parseJSON<RawSourceMap>)
            .then((sourceMap) => this.getSourceMapDebugId(sourceMap)).inner;
    }

    /**
     * Adds required snippets and comments to source, and modifies sourcemap to include debug ID.
     * @param source Source content.
     * @param sourceMap Sourcemap object or JSON.
     * @param debugId Debug ID. If not provided, one will be generated from `source`.
     * @returns Used debug ID, new source and new sourcemap.
     */
    public async processSourceAndSourceMap(
        source: string,
        sourceMap: string | RawSourceMap,
        debugId?: string,
    ): ResultPromise<ProcessResult, string> {
        if (!debugId) {
            debugId = stringToUuid(source);
        }

        if (typeof sourceMap === 'string') {
            const parseResult = parseJSON<RawSourceMap>(sourceMap);
            if (parseResult.isErr()) {
                return parseResult;
            }
            sourceMap = parseResult.data;
        }

        const sourceSnippet = this._debugIdGenerator.generateSourceSnippet(debugId);

        const shebang = source.match(/^(#!.+\n)/)?.[1];
        const sourceWithSnippet = shebang
            ? shebang + sourceSnippet + '\n' + source.substring(shebang.length)
            : sourceSnippet + '\n' + source;

        const sourceComment = this._debugIdGenerator.generateSourceComment(debugId);
        const newSource = appendBeforeWhitespaces(sourceWithSnippet, '\n' + sourceComment);

        // We need to offset the source map by amount of lines that we're inserting to the source code
        // Sourcemaps map code like this:
        // original code X:Y => generated code A:B
        // So if we add any code to generated code, mappings after that code will become invalid
        // We need to offset the mapping lines by sourceSnippetNewlineCount:
        // original code X:Y => generated code (A + sourceSnippetNewlineCount):B
        const sourceSnippetNewlineCount = sourceSnippet.match(/\n/g)?.length ?? 0;
        const offsetSourceMap = await this.offsetSourceMap(sourceMap, sourceSnippetNewlineCount + 1);
        const newSourceMap = this._debugIdGenerator.addSourceMapDebugId(offsetSourceMap, debugId);
        return Ok({ debugId, source: newSource, sourceMap: newSourceMap });
    }

    /**
     * Adds required snippets and comments to source, and modifies sourcemap to include debug ID.
     * Will write modified content to the files.
     * @param sourcePath Path to the source.
     * @param sourceMapPath Path to the sourcemap. If not specified, will try to resolve from sourceMapURL.
     * @param debugId Debug ID. If not provided, one will be generated from `source`.
     * @returns Used debug ID.
     */
    public async processSourceAndSourceMapFiles(
        sourcePath: string,
        sourceMapPath?: string,
        debugId?: string,
    ): ResultPromise<ProcessResultWithPaths, string> {
        const sourceReadResult = await readFile(sourcePath);
        if (sourceReadResult.isErr()) {
            return sourceReadResult;
        }

        const source = sourceReadResult.data;
        if (!sourceMapPath) {
            const sourceMapPathResult = this.getSourceMapPathFromSource(source, sourcePath);
            if (sourceMapPathResult.isErr()) {
                return sourceMapPathResult;
            }

            sourceMapPath = sourceMapPathResult.data;
        }

        const sourceMapReadResult = await readFile(sourceMapPath);
        if (sourceMapReadResult.isErr()) {
            return sourceMapReadResult;
        }

        const sourceMap = sourceMapReadResult.data;

        const processResult = await this.processSourceAndSourceMap(source, sourceMap, debugId);
        if (processResult.isErr()) {
            return processResult;
        }

        return Ok({
            ...processResult.data,
            sourcePath,
            sourceMapPath,
        } as ProcessResultWithPaths);
    }

    public async getSourceMapPathFromSourceFile(sourcePath: string) {
        const sourceReadResult = await readFile(sourcePath);
        if (sourceReadResult.isErr()) {
            return sourceReadResult;
        }

        return this.getSourceMapPathFromSource(sourceReadResult.data, sourcePath);
    }

    public getSourceMapPathFromSource(source: string, sourcePath: string) {
        const match = source.match(/^\/\/# sourceMappingURL=(.+)$/m);
        if (!match || !match[1]) {
            return Err('could not find source map for source.');
        }

        return Ok(path.resolve(path.dirname(sourcePath), match[1]));
    }

    public async addSourcesToSourceMap(
        sourceMap: string | RawSourceMap,
        sourceMapPath: string,
    ): ResultPromise<RawSourceMap, string> {
        if (typeof sourceMap === 'string') {
            const parseResult = parseJSON<RawSourceMap>(sourceMap);
            if (parseResult.isErr()) {
                return parseResult;
            }
            sourceMap = parseResult.data;
        }

        const sourceRoot = sourceMap.sourceRoot
            ? path.resolve(path.dirname(sourceMapPath), sourceMap.sourceRoot)
            : path.resolve(path.dirname(sourceMapPath));

        const sourcesContent: string[] = [];
        for (const sourcePath of sourceMap.sources) {
            const readResult = await readFile(path.resolve(sourceRoot, sourcePath));
            if (readResult.isErr()) {
                return readResult;
            }

            sourcesContent.push(readResult.data);
        }

        return Ok({
            ...sourceMap,
            sourcesContent,
        });
    }

    public doesSourceMapHaveSources(sourceMap: RawSourceMap): boolean {
        return sourceMap.sources?.length === sourceMap.sourcesContent?.length;
    }

    public async offsetSourceMap(sourceMap: RawSourceMap, count: number): Promise<RawSourceMap> {
        // Each line in sourcemap is separated by a semicolon.
        // Offsetting source map lines is just done by prepending semicolons
        const offset = ';'.repeat(count);
        const mappings = offset + sourceMap.mappings;
        return { ...sourceMap, mappings };
    }
}
