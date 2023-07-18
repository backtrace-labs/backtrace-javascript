import fs from 'fs';
import path from 'path';
import { BasicSourceMapConsumer, Position, RawSourceMap, SourceMapConsumer, SourceMapGenerator } from 'source-map';
import { DebugIdGenerator } from './DebugIdGenerator';
import { stringToUuid } from './helpers/stringToUuid';
import { ResultPromise } from './models/AsyncResult';
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
        const readResult = await this.readFile(sourcePath);
        if (readResult.isErr()) {
            return readResult;
        }

        return Ok(this.isSourceProcessed(readResult.data));
    }

    public async isSourceMapFileProcessed(sourceMapPath: string): ResultPromise<boolean, string> {
        const readResult = await this.readFile(sourceMapPath);
        if (readResult.isErr()) {
            return readResult;
        }

        let sourcemap: RawSourceMap;
        try {
            sourcemap = JSON.parse(readResult.data) as RawSourceMap;
        } catch (err) {
            return Err('failed to parse sourcemap JSON');
        }

        return Ok(this.isSourceMapProcessed(sourcemap));
    }

    public getSourceMapDebugId(sourceMap: RawSourceMap): Result<string, string> {
        const debugId = this._debugIdGenerator.getSourceMapDebugId(sourceMap);
        if (!debugId) {
            return Err('sourcemap does not have a debug ID');
        }

        return Ok(debugId);
    }

    public async getSourceMapFileDebugId(sourceMapPath: string): ResultPromise<string, string> {
        const readResult = await this.readFile(sourceMapPath);
        if (readResult.isErr()) {
            return readResult;
        }

        let sourcemap: RawSourceMap;
        try {
            sourcemap = JSON.parse(readResult.data) as RawSourceMap;
        } catch (err) {
            return Err('failed to parse sourcemap JSON');
        }

        const debugId = this._debugIdGenerator.getSourceMapDebugId(sourcemap);
        if (!debugId) {
            return Err('sourcemap does not have a debug ID');
        }

        return Ok(debugId);
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

        const sourceSnippet = this._debugIdGenerator.generateSourceSnippet(debugId);
        const sourceComment = this._debugIdGenerator.generateSourceComment(debugId);

        const shebang = source.match(/^(#!.+\n)/)?.[1];

        const newSource =
            (shebang
                ? shebang + sourceSnippet + '\n' + source.substring(shebang.length)
                : sourceSnippet + '\n' + source) +
            '\n' +
            sourceComment;

        // We need to offset the source map by amount of lines that we're inserting to the source code
        // Sourcemaps map code like this:
        // original code X:Y => generated code A:B
        // So if we add any code to generated code, mappings after that code will become invalid
        // We need to offset the mapping lines by sourceSnippetNewlineCount:
        // original code X:Y => generated code (A + sourceSnippetNewlineCount):B
        const sourceSnippetNewlineCount = (sourceSnippet.match(/\n/g)?.length ?? 0) + (shebang ? 1 : 0);
        const offsetSourceMapResult = await this.offsetSourceMap(sourceMap, 0, sourceSnippetNewlineCount + 1);
        if (offsetSourceMapResult.isErr()) {
            return offsetSourceMapResult;
        }

        const newSourceMap = this._debugIdGenerator.addSourceMapDebugId(offsetSourceMapResult.data, debugId);
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
        const sourceReadResult = await this.readFile(sourcePath);
        if (sourceReadResult.isErr()) {
            return sourceReadResult;
        }

        const source = sourceReadResult.data;
        if (!sourceMapPath) {
            const match = source.match(/^\/\/# sourceMappingURL=(.+)$/m);
            if (!match || !match[1]) {
                return Err('Could not find source map for source.');
            }

            sourceMapPath = path.resolve(path.dirname(sourcePath), match[1]);
        }

        const sourceMapReadResult = await this.readFile(sourceMapPath);
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

    public async addSourcesToSourceMap(
        sourceMap: string | RawSourceMap,
        sourceMapPath: string,
    ): ResultPromise<RawSourceMap, string> {
        if (typeof sourceMap === 'string') {
            sourceMap = JSON.parse(sourceMap) as RawSourceMap;
        }

        const sourceRoot = sourceMap.sourceRoot
            ? path.resolve(path.dirname(sourceMapPath), sourceMap.sourceRoot)
            : path.resolve(path.dirname(sourceMapPath));

        const sourcesContent: string[] = [];
        for (const sourcePath of sourceMap.sources) {
            const readResult = await this.readFile(path.resolve(sourceRoot, sourcePath));
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
        return sourceMap.sources.length === sourceMap.sourcesContent?.length;
    }

    private async offsetSourceMap(
        sourceMap: string | RawSourceMap,
        fromLine: number,
        count: number,
    ): ResultPromise<RawSourceMap, string> {
        const sourceMapObj = typeof sourceMap === 'string' ? (JSON.parse(sourceMap) as RawSourceMap) : sourceMap;
        const consumer = (await new SourceMapConsumer(sourceMapObj)) as BasicSourceMapConsumer;
        const newSourceMap = new SourceMapGenerator({
            file: consumer.file,
            sourceRoot: consumer.sourceRoot,
        });

        consumer.eachMapping((m) => {
            if (m.generatedLine < fromLine) {
                return;
            }

            // Despite how the mappings are written, addMapping expects here a null value if the column/line is not set
            newSourceMap.addMapping({
                source: m.source,
                name: m.name,
                generated:
                    m?.generatedColumn != null && m?.generatedLine != null
                        ? { column: m.generatedColumn, line: m.generatedLine + count }
                        : (null as unknown as Position),
                original:
                    m?.originalColumn != null && m?.originalLine != null
                        ? { column: m.originalColumn, line: m.originalLine }
                        : (null as unknown as Position),
            });
        });

        const newSourceMapJson = newSourceMap.toJSON();
        return Ok({ ...sourceMapObj, ...newSourceMapJson });
    }

    private async readFile(file: string): ResultPromise<string, string> {
        try {
            return Ok(await fs.promises.readFile(file, 'utf-8'));
        } catch (err) {
            return Err(`failed to read file: ${err instanceof Error ? err.message : 'unknown error'}`);
        }
    }
}
