import fs from 'fs';
import path from 'path';
import { BasicSourceMapConsumer, Position, RawSourceMap, SourceMapConsumer, SourceMapGenerator } from 'source-map';
import { DebugIdGenerator } from './DebugIdGenerator';
import { stringToUuid } from './helpers/stringToUuid';

export class SourceProcessor {
    constructor(private readonly _debugIdGenerator: DebugIdGenerator) {}

    public isSourceProcessed(source: string): boolean {
        return !!this._debugIdGenerator.getSourceDebugId(source);
    }

    public isSourceMapProcessed(sourceMap: string | RawSourceMap): boolean {
        if (typeof sourceMap === 'string') {
            sourceMap = JSON.parse(sourceMap) as RawSourceMap;
        }

        return !!this._debugIdGenerator.getSourceMapDebugId(sourceMap);
    }

    public async isSourceFileProcessed(sourcePath: string): Promise<boolean> {
        const source = await fs.promises.readFile(sourcePath, 'utf8');
        return this.isSourceProcessed(source);
    }

    public async isSourceMapFileProcessed(sourceMapPath: string): Promise<boolean> {
        const source = await fs.promises.readFile(sourceMapPath, 'utf8');
        return this.isSourceMapProcessed(source);
    }

    /**
     * Adds required snippets and comments to source, and modifies sourcemap to include debug ID.
     * @param source Source content.
     * @param sourceMap Sourcemap object or JSON.
     * @param debugId Debug ID. If not provided, one will be generated from `source`.
     * @returns Used debug ID, new source and new sourcemap.
     */
    public async processSourceAndSourceMap(source: string, sourceMap: string | RawSourceMap, debugId?: string) {
        if (!debugId) {
            debugId = stringToUuid(source);
        }

        const sourceSnippet = this._debugIdGenerator.generateSourceSnippet(debugId);
        const sourceComment = this._debugIdGenerator.generateSourceComment(debugId);

        const newSource = sourceSnippet + '\n' + source + '\n' + sourceComment;

        // We need to offset the source map by amount of lines that we're inserting to the source code
        // Sourcemaps map code like this:
        // original code X:Y => generated code A:B
        // So if we add any code to generated code, mappings after that code will become invalid
        // We need to offset the mapping lines by sourceSnippetNewlineCount:
        // original code X:Y => generated code (A + sourceSnippetNewlineCount):B
        const sourceSnippetNewlineCount = sourceSnippet.match(/\n/g)?.length ?? 0;
        const offsetSourceMap = await this.offsetSourceMap(sourceMap, 0, sourceSnippetNewlineCount + 1);
        const newSourceMap = this._debugIdGenerator.addSourceMapDebugId(offsetSourceMap, debugId);

        return { debugId, source: newSource, sourceMap: newSourceMap };
    }

    /**
     * Adds required snippets and comments to source, and modifies sourcemap to include debug ID.
     * Will write modified content to the files.
     * @param sourcePath Path to the source.
     * @param sourceMapPath Path to the sourcemap. If not specified, will try to resolve from sourceMapURL.
     * @param debugId Debug ID. If not provided, one will be generated from `source`.
     * @returns Used debug ID.
     */
    public async processSourceAndSourceMapFiles(sourcePath: string, sourceMapPath?: string, debugId?: string) {
        const source = await fs.promises.readFile(sourcePath, 'utf8');
        if (!sourceMapPath) {
            const match = source.match(/^\/\/# sourceMappingURL=(.+)$/m);
            if (!match || !match[1]) {
                throw new Error('Could not find source map for source.');
            }

            sourceMapPath = path.resolve(path.dirname(sourcePath), match[1]);
        }

        const sourceMap = await fs.promises.readFile(sourceMapPath, 'utf8');

        const result = await this.processSourceAndSourceMap(source, sourceMap, debugId);
        return {
            ...result,
            sourcePath,
            sourceMapPath,
        };
    }

    public async addSourcesToSourceMap(sourceMap: string | RawSourceMap, sourceMapPath: string): Promise<RawSourceMap> {
        if (typeof sourceMap === 'string') {
            sourceMap = JSON.parse(sourceMap) as RawSourceMap;
        }

        const sourceRoot = sourceMap.sourceRoot
            ? path.resolve(path.dirname(sourceMapPath), sourceMap.sourceRoot)
            : path.resolve(path.dirname(sourceMapPath));

        const sourcesContent: string[] = [];
        for (const sourcePath of sourceMap.sources) {
            const source = await fs.promises.readFile(path.resolve(sourceRoot, sourcePath), 'utf-8');
            sourcesContent.push(source);
        }

        return {
            ...sourceMap,
            sourcesContent,
        };
    }

    public doesSourceMapHaveSources(sourceMap: string | RawSourceMap) {
        if (typeof sourceMap === 'string') {
            sourceMap = JSON.parse(sourceMap) as RawSourceMap;
        }

        return sourceMap.sources.length === sourceMap.sourcesContent?.length;
    }

    private async offsetSourceMap(
        sourceMap: string | RawSourceMap,
        fromLine: number,
        count: number,
    ): Promise<RawSourceMap> {
        const sourceMapObj = typeof sourceMap === 'string' ? JSON.parse(sourceMap) : sourceMap;
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
        return { ...sourceMapObj, ...newSourceMapJson };
    }
}
