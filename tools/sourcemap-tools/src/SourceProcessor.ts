import path from 'path';
import { DebugIdGenerator } from './DebugIdGenerator';
import { parseJSON, readFile, statFile } from './helpers/common';
import { pipe } from './helpers/flow';
import { appendBeforeWhitespaces } from './helpers/stringHelpers';
import { stringToUuid } from './helpers/stringToUuid';
import { RawSourceMap, RawSourceMapWithDebugId } from './models/RawSourceMap';
import { Err, Ok, R, ResultPromise } from './models/Result';

export interface ProcessResult {
    readonly debugId: string;
    readonly source: string;
    readonly sourceMap: RawSourceMapWithDebugId;
}

export interface ProcessResultWithPaths extends ProcessResult {
    readonly sourcePath: string;
    readonly sourceMapPath: string;
}

export interface AddSourcesResult {
    readonly sourceMap: RawSourceMap;

    /**
     * Source paths that were successfully added.
     */
    readonly succeeded: string[];

    /**
     * Source paths that failed to read, but source content was already in the sourcemap.
     */
    readonly skipped: string[];

    /**
     * Source paths that failed to read and the sources content was not in the sourcemap.
     */
    readonly failed: string[];
}

export class SourceProcessor {
    constructor(private readonly _debugIdGenerator: DebugIdGenerator) {}

    public isSourceProcessed(source: string): boolean {
        return !!this._debugIdGenerator.getSourceDebugIdFromComment(source);
    }

    public isSourceMapProcessed(sourceMap: RawSourceMap): boolean {
        return !!this._debugIdGenerator.getSourceMapDebugId(sourceMap);
    }

    public async isSourceFileProcessed(sourcePath: string): ResultPromise<boolean, string> {
        return pipe(
            sourcePath,
            readFile,
            R.map((v) => this.isSourceProcessed(v)),
        );
    }

    public async isSourceMapFileProcessed(sourceMapPath: string): ResultPromise<boolean, string> {
        return pipe(
            sourceMapPath,
            readFile,
            R.map(parseJSON<RawSourceMap>),
            R.map((v) => this.isSourceMapProcessed(v)),
        );
    }

    public getSourceDebugId(source: string): string | undefined {
        return this._debugIdGenerator.getSourceDebugIdFromComment(source);
    }

    public getSourceMapDebugId(sourceMap: RawSourceMap): string | undefined {
        return this._debugIdGenerator.getSourceMapDebugId(sourceMap);
    }

    public async getSourceMapFileDebugId(sourceMapPath: string): ResultPromise<string | undefined, string> {
        return pipe(
            sourceMapPath,
            readFile,
            R.map(parseJSON<RawSourceMap>),
            R.map((sourceMap) => this.getSourceMapDebugId(sourceMap)),
        );
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
        sourceMap: RawSourceMap,
        debugId?: string,
        force?: boolean,
    ): Promise<ProcessResult> {
        const sourceDebugId = this.getSourceDebugId(source);
        if (!debugId) {
            debugId = sourceDebugId ?? stringToUuid(source);
        }

        let newSource = source;
        let offsetSourceMap: RawSourceMap | undefined;

        // If source has debug ID, but it is different, we need to only replace it
        if (sourceDebugId && debugId !== sourceDebugId) {
            newSource = this._debugIdGenerator.replaceDebugId(source, sourceDebugId, debugId);
        }

        if (force || !sourceDebugId || !this._debugIdGenerator.hasCodeSnippet(source, debugId)) {
            const sourceSnippet = this._debugIdGenerator.generateSourceSnippet(debugId);

            const shebang = source.match(/^(#!.+\n)/)?.[1];
            newSource = shebang
                ? shebang + sourceSnippet + '\n' + source.substring(shebang.length)
                : sourceSnippet + '\n' + source;

            // We need to offset the source map by amount of lines that we're inserting to the source code
            // Sourcemaps map code like this:
            // original code X:Y => generated code A:B
            // So if we add any code to generated code, mappings after that code will become invalid
            // We need to offset the mapping lines by sourceSnippetNewlineCount:
            // original code X:Y => generated code (A + sourceSnippetNewlineCount):B
            const sourceSnippetNewlineCount = sourceSnippet.match(/\n/g)?.length ?? 0;
            offsetSourceMap = await this.offsetSourceMap(sourceMap, sourceSnippetNewlineCount + 1);
        }

        if (force || !sourceDebugId || !this._debugIdGenerator.hasCommentSnippet(source, debugId)) {
            const sourceComment = this._debugIdGenerator.generateSourceComment(debugId);
            newSource = appendBeforeWhitespaces(newSource, '\n' + sourceComment);
        }

        const newSourceMap = this._debugIdGenerator.addSourceMapDebugId(offsetSourceMap ?? sourceMap, debugId);
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
    public async processSourceAndSourceMapFiles(
        sourcePath: string,
        sourceMapPath?: string,
        debugId?: string,
        force?: boolean,
    ): ResultPromise<ProcessResultWithPaths, string> {
        const sourceReadResult = await readFile(sourcePath);
        if (sourceReadResult.isErr()) {
            return sourceReadResult;
        }

        const source = sourceReadResult.data;
        if (!sourceMapPath) {
            const pathFromSource = await this.getSourceMapPathFromSource(source, sourcePath);
            if (!pathFromSource) {
                return Err('could not find source map for source');
            }

            sourceMapPath = pathFromSource;
        }

        const sourceMapReadResult = await readFile(sourceMapPath);
        if (sourceMapReadResult.isErr()) {
            return sourceMapReadResult;
        }

        const sourceMapJson = sourceMapReadResult.data;

        const parseResult = parseJSON<RawSourceMap>(sourceMapJson);
        if (parseResult.isErr()) {
            return parseResult;
        }
        const sourceMap = parseResult.data;

        const processResult = await this.processSourceAndSourceMap(source, sourceMap, debugId, force);
        return Ok({
            ...processResult,
            sourcePath,
            sourceMapPath,
        } as ProcessResultWithPaths);
    }

    public async getSourceMapPathFromSourceFile(sourcePath: string) {
        const sourceReadResult = await readFile(sourcePath);
        if (sourceReadResult.isErr()) {
            return sourceReadResult;
        }

        return Ok(await this.getSourceMapPathFromSource(sourceReadResult.data, sourcePath));
    }

    public async getSourceMapPathFromSource(source: string, sourcePath: string): Promise<string | undefined> {
        const matchAll = (str: string, regex: RegExp) => {
            const result: RegExpMatchArray[] = [];
            // eslint-disable-next-line no-constant-condition
            while (true) {
                const match = regex.exec(str);
                if (!match) {
                    return result;
                }
                result.push(match);
            }
        };

        const checkFile = (filePath: string) =>
            pipe(filePath, statFile, (result) => (result.isOk() && result.data.isFile() ? filePath : undefined));

        const sourceMapName = path.basename(sourcePath) + '.map';
        const checkFileInDir = (dir: string) =>
            pipe(dir, statFile, (result) =>
                result.isOk() && result.data.isDirectory()
                    ? // If path exists and is a directory, check if file exists in that dir
                      checkFile(path.join(dir, sourceMapName))
                    : // If path does not exist or is not a directory, check if file exists in dir of that path
                      checkFile(path.join(path.dirname(dir), sourceMapName)),
            );

        const matches = matchAll(source, /^\s*\/\/# sourceMappingURL=(.+)$/gm);
        if (!matches.length) {
            return checkFileInDir(sourcePath);
        }

        for (const match of matches.reverse()) {
            const file = match[1];
            if (!file) {
                continue;
            }

            const fullPath = path.resolve(path.dirname(sourcePath), file);
            if (await checkFile(fullPath)) {
                return fullPath;
            }

            const fileInDir = await checkFileInDir(fullPath);
            if (fileInDir) {
                return fileInDir;
            }
        }

        return checkFileInDir(sourcePath);
    }

    public async addSourcesToSourceMap(
        sourceMap: string | RawSourceMap,
        sourceMapPath: string,
        force: boolean,
    ): ResultPromise<AddSourcesResult, string> {
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

        const succeeded: string[] = [];
        const skipped: string[] = [];
        const failed: string[] = [];

        const sourcesContent: string[] = sourceMap.sourcesContent ?? [];
        for (let i = 0; i < sourceMap.sources.length; i++) {
            const sourcePath = sourceMap.sources[i];
            if (sourcesContent[i] && !force) {
                skipped.push(sourcePath);
                continue;
            }

            const readResult = await readFile(path.resolve(sourceRoot, sourcePath));
            if (readResult.isErr()) {
                failed.push(sourcePath);
            } else {
                sourcesContent[i] = readResult.data;
                succeeded.push(sourcePath);
            }
        }

        return Ok({
            sourceMap: {
                ...sourceMap,
                sourcesContent,
            },
            succeeded,
            skipped,
            failed,
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
