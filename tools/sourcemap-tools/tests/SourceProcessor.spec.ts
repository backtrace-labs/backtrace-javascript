import assert from 'assert';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { RawSourceMap, SourceMapConsumer } from 'source-map';
import { DebugIdGenerator, SOURCEMAP_DEBUG_ID_KEY, SourceProcessor } from '../src';

describe('SourceProcessor', () => {
    const source = `function foo(){console.log("Hello World!")}foo();`;
    const sourceMap = {
        version: 3,
        file: 'source.js',
        sources: ['source.js'],
        names: ['foo', 'console', 'log'],
        mappings: 'AAAA,SAASA,MACLC,QAAQC,IAAI,cAAc,CAC9B,CAEAF,IAAI',
    };

    const sourceWithShebang = `#!shebang
function foo(){console.log("Hello World!")}foo();`;
    const sourceWithShebangMap = {
        version: 3,
        file: 'source.js',
        sources: ['source.js'],
        names: ['foo', 'console', 'log'],
        mappings: ';AACA,SAASA,MACLC,QAAQC,IAAI,cAAc,CAC9B,CACAF,IAAI',
    };

    const sourceWithShebangElsewhere = `function foo(){console.log("Hello World!")}foo();
#!shebang`;
    const sourceWithShebangElsewhereMap = {
        version: 3,
        file: 'source.js',
        sources: ['source.js'],
        names: ['foo', 'console', 'log'],
        mappings: 'AACA,SAASA,MACLC,QAAQC,IAAI,cAAc,CAC9B,CACAF,IAAI',
    };

    const processedSource = (
        debugId: string,
    ) => `;!function(){try{var e="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:{},n=(new Error).stack;n&&(e._btDebugIds=e._btDebugIds||{},e._btDebugIds[n]="${debugId}")}catch(e){}}();
(()=>{"use strict";console.log("Hello World!")})();
//# sourceMappingURL=source.js.map
//# debugId=${debugId}
`;

    const processedSourceMap = (debugId: string) => ({
        version: 3,
        file: 'source.js',
        sources: ['./source.ts'],
        names: ['console', 'log'],
        mappings: ';;mBAAAA,QAAQC,IAAI,e',
        debugId,
    });

    describe('processSourceAndSourceMap', () => {
        it('should append source snippet to the source on the first line', async () => {
            const expected = 'APPENDED_SOURCE';
            const debugIdGenerator = new DebugIdGenerator();

            jest.spyOn(debugIdGenerator, 'generateSourceSnippet').mockReturnValue(expected);

            const sourceProcessor = new SourceProcessor(debugIdGenerator);
            const result = await sourceProcessor.processSourceAndSourceMap(source, sourceMap);

            expect(result.source).toMatch(new RegExp(`^${expected}\n`));
        });

        it('should append source snippet to the source on the first line with source having shebang not on the first line', async () => {
            const expected = 'APPENDED_SOURCE';
            const debugIdGenerator = new DebugIdGenerator();

            jest.spyOn(debugIdGenerator, 'generateSourceSnippet').mockReturnValue(expected);

            const sourceProcessor = new SourceProcessor(debugIdGenerator);
            const result = await sourceProcessor.processSourceAndSourceMap(
                sourceWithShebangElsewhere,
                sourceWithShebangElsewhereMap,
            );

            expect(result.source).toMatch(new RegExp(`^${expected}\n`));
        });

        it('should append source snippet to the source after shebang', async () => {
            const expected = 'APPENDED_SOURCE';
            const debugIdGenerator = new DebugIdGenerator();

            jest.spyOn(debugIdGenerator, 'generateSourceSnippet').mockReturnValue(expected);

            const sourceProcessor = new SourceProcessor(debugIdGenerator);
            const result = await sourceProcessor.processSourceAndSourceMap(sourceWithShebang, sourceWithShebangMap);

            expect(result.source).toMatch(new RegExp(`^(#!.+\n)${expected}\n`));
        });

        it('should append comment snippet to the source on the last line', async () => {
            const expected = 'APPENDED_COMMENT';
            const debugIdGenerator = new DebugIdGenerator();

            jest.spyOn(debugIdGenerator, 'generateSourceComment').mockReturnValue(expected);

            const sourceProcessor = new SourceProcessor(debugIdGenerator);
            const result = await sourceProcessor.processSourceAndSourceMap(source, sourceMap);

            expect(result.source).toMatch(new RegExp(`\n${expected}$`));
        });

        it('should not add any whitespaces at end if there were none before when appending comment snippet', async () => {
            const source = `abc`;
            const expected = 'APPENDED_COMMENT';
            const debugIdGenerator = new DebugIdGenerator();

            jest.spyOn(debugIdGenerator, 'generateSourceComment').mockReturnValue(expected);

            const sourceProcessor = new SourceProcessor(debugIdGenerator);
            const result = await sourceProcessor.processSourceAndSourceMap(source, sourceMap);

            expect(result.source).not.toMatch(/\s+$/);
        });

        it('should leave end whitespaces as they are when appending comment snippet', async () => {
            const whitespaces = `\n\n\n    \n\t    \n\r`;
            const source = `abc${whitespaces}`;
            const expected = 'APPENDED_COMMENT';
            const debugIdGenerator = new DebugIdGenerator();

            jest.spyOn(debugIdGenerator, 'generateSourceComment').mockReturnValue(expected);

            const sourceProcessor = new SourceProcessor(debugIdGenerator);
            const result = await sourceProcessor.processSourceAndSourceMap(source, sourceMap);

            expect(result.source).toMatch(new RegExp(`${whitespaces}$`));
        });

        it('should not touch the original source', async () => {
            const debugIdGenerator = new DebugIdGenerator();

            jest.spyOn(debugIdGenerator, 'generateSourceSnippet').mockReturnValue('APPENDED_SOURCE');

            const sourceProcessor = new SourceProcessor(debugIdGenerator);
            const result = await sourceProcessor.processSourceAndSourceMap(source, sourceMap);

            expect(result.source).toContain(source);
        });

        it('should not touch the original sourcemap keys apart from mappings', async () => {
            const debugIdGenerator = new DebugIdGenerator();

            jest.spyOn(debugIdGenerator, 'generateSourceSnippet').mockReturnValue('APPENDED_SOURCE');

            const sourceProcessor = new SourceProcessor(debugIdGenerator);
            const result = await sourceProcessor.processSourceAndSourceMap(source, sourceMap);

            expect(result.sourceMap).toMatchObject({ ...sourceMap, mappings: result.sourceMap.mappings });
        });

        it('should return sourcemap from DebugIdGenerator', async () => {
            const expected = { [SOURCEMAP_DEBUG_ID_KEY]: 'debugId' };
            const debugIdGenerator = new DebugIdGenerator();

            jest.spyOn(debugIdGenerator, 'addSourceMapDebugId').mockReturnValue(expected);

            const sourceProcessor = new SourceProcessor(debugIdGenerator);
            const result = await sourceProcessor.processSourceAndSourceMap(source, sourceMap);

            expect(result.sourceMap).toStrictEqual(expected);
        });

        it('should offset sourcemap lines by number of newlines in source snippet + 1', async () => {
            const debugIdGenerator = new DebugIdGenerator();
            const sourceProcessor = new SourceProcessor(debugIdGenerator);
            const snippet = 'a\nb\nc\nd';
            const expectedNewLineCount = (snippet.match(/\n/g)?.length ?? 0) + 1;

            jest.spyOn(debugIdGenerator, 'generateSourceSnippet').mockReturnValue(snippet);
            const offsetSpy = jest.spyOn(sourceProcessor, 'offsetSourceMap');

            await sourceProcessor.processSourceAndSourceMap(source, sourceMap);

            expect(offsetSpy).toBeCalledWith(expect.anything(), expectedNewLineCount);
        });

        it('should offset sourcemap lines by number of newlines in source snippet + 1 with source having shebang not on the first line', async () => {
            const debugIdGenerator = new DebugIdGenerator();
            const sourceProcessor = new SourceProcessor(debugIdGenerator);
            const snippet = 'a\nb\nc\nd';
            const expectedNewLineCount = (snippet.match(/\n/g)?.length ?? 0) + 1;

            jest.spyOn(debugIdGenerator, 'generateSourceSnippet').mockReturnValue(snippet);
            const offsetSpy = jest.spyOn(sourceProcessor, 'offsetSourceMap');

            await sourceProcessor.processSourceAndSourceMap(sourceWithShebangElsewhere, sourceWithShebangElsewhereMap);

            expect(offsetSpy).toBeCalledWith(expect.anything(), expectedNewLineCount);
        });

        it('should offset sourcemap lines by number of newlines in source with shebang with snippet + 1', async () => {
            const debugIdGenerator = new DebugIdGenerator();
            const sourceProcessor = new SourceProcessor(debugIdGenerator);
            const snippet = 'a\nb\nc\nd';
            const expectedNewLineCount = (snippet.match(/\n/g)?.length ?? 0) + 1;

            jest.spyOn(debugIdGenerator, 'generateSourceSnippet').mockReturnValue(snippet);
            const offsetSpy = jest.spyOn(sourceProcessor, 'offsetSourceMap');

            await sourceProcessor.processSourceAndSourceMap(sourceWithShebang, sourceWithShebangMap);

            expect(offsetSpy).toBeCalledWith(expect.anything(), expectedNewLineCount);
        });

        it('should call process function with content from files', async () => {
            const sourcePath = path.join(__dirname, './testFiles/source.js');
            const sourceMapPath = path.join(__dirname, './testFiles/source.js.map');
            const sourceContent = await fs.promises.readFile(sourcePath, 'utf-8');
            const sourceMapContent = JSON.parse(await fs.promises.readFile(sourceMapPath, 'utf-8'));
            const debugId = 'DEBUG_ID';

            const sourceProcessor = new SourceProcessor(new DebugIdGenerator());
            const processFn = jest
                .spyOn(sourceProcessor, 'processSourceAndSourceMap')
                .mockImplementation(async (_, __, debugId) => ({
                    source: sourceContent,
                    sourceMap: sourceMapContent,
                    debugId: debugId ?? 'debugId',
                }));

            await sourceProcessor.processSourceAndSourceMapFiles(sourcePath, sourceMapPath, debugId);

            expect(processFn).toBeCalledWith(sourceContent, sourceMapContent, debugId);
        });

        it('should call process function with sourcemap detected from source', async () => {
            const sourcePath = path.join(__dirname, './testFiles/source.js');
            const sourceMapPath = path.join(__dirname, './testFiles/source.js.map');
            const sourceContent = await fs.promises.readFile(sourcePath, 'utf-8');
            const sourceMapContent = JSON.parse(await fs.promises.readFile(sourceMapPath, 'utf-8'));
            const debugId = 'DEBUG_ID';

            const sourceProcessor = new SourceProcessor(new DebugIdGenerator());
            const processFn = jest
                .spyOn(sourceProcessor, 'processSourceAndSourceMap')
                .mockImplementation(async (_, __, debugId) => ({
                    source: sourceContent,
                    sourceMap: sourceMapContent,
                    debugId: debugId ?? 'debugId',
                }));

            await sourceProcessor.processSourceAndSourceMapFiles(sourcePath, undefined, debugId);

            expect(processFn).toBeCalledWith(sourceContent, sourceMapContent, debugId);
        });

        it('should return unmodified source when source has debug ID', async () => {
            const debugId = randomUUID();
            const source = processedSource(debugId);
            const sourceProcessor = new SourceProcessor(new DebugIdGenerator());
            const result = await sourceProcessor.processSourceAndSourceMap(source, processedSourceMap(debugId));

            expect(result.source).toEqual(source);
        });

        it('should return unmodified source when source has same debug ID as provided', async () => {
            const debugId = randomUUID();
            const source = processedSource(debugId);
            const sourceProcessor = new SourceProcessor(new DebugIdGenerator());
            const result = await sourceProcessor.processSourceAndSourceMap(
                source,
                processedSourceMap(debugId),
                debugId,
            );

            expect(result.source).toEqual(source);
        });

        it("should return sourcemap with source's debug ID when source has debug ID", async () => {
            const debugId = randomUUID();
            const sourceProcessor = new SourceProcessor(new DebugIdGenerator());
            const result = await sourceProcessor.processSourceAndSourceMap(processedSource(debugId), sourceMap);

            expect(result.sourceMap.debugId).toEqual(debugId);
        });

        it('should call replace debug ID when source has different debug ID than provided', async () => {
            const oldDebugId = randomUUID();
            const newDebugId = randomUUID();
            const source = processedSource(oldDebugId);
            const debugIdGenerator = new DebugIdGenerator();

            const spy = jest.spyOn(debugIdGenerator, 'replaceDebugId');

            const sourceProcessor = new SourceProcessor(debugIdGenerator);
            await sourceProcessor.processSourceAndSourceMap(source, processedSourceMap(oldDebugId), newDebugId);

            expect(spy).toBeCalledWith(source, oldDebugId, newDebugId);
        });
    });

    describe('addSourcesToSourceMap', () => {
        it('should add original sources to source map', async () => {
            const originalSourcePath = path.join(__dirname, './testFiles/source.ts');
            const sourceMapPath = path.join(__dirname, './testFiles/source_no_content.js.map');

            const sourceContent = await fs.promises.readFile(originalSourcePath, 'utf-8');
            const sourceMapContent = await fs.promises.readFile(sourceMapPath, 'utf-8');

            const sourceProcessor = new SourceProcessor(new DebugIdGenerator());
            const result = await sourceProcessor.addSourcesToSourceMap(sourceMapContent, sourceMapPath, false);
            assert(result.isOk());

            expect(result.data.sourceMap.sourcesContent).toEqual([sourceContent]);
        });

        it('should not overwrite sources in source map when force is false', async () => {
            const sourceMapPath = path.join(__dirname, './testFiles/source.js.map');

            const sourceMapContent = JSON.parse(await fs.promises.readFile(sourceMapPath, 'utf-8')) as RawSourceMap;
            sourceMapContent.sourcesContent = ['abc'];

            const sourceProcessor = new SourceProcessor(new DebugIdGenerator());
            const result = await sourceProcessor.addSourcesToSourceMap(sourceMapContent, sourceMapPath, false);
            assert(result.isOk());

            expect(result.data.sourceMap.sourcesContent).toEqual(['abc']);
        });

        it('should overwrite sources in source map when force is true', async () => {
            const originalSourcePath = path.join(__dirname, './testFiles/source.ts');
            const sourceMapPath = path.join(__dirname, './testFiles/source.js.map');

            const sourceContent = await fs.promises.readFile(originalSourcePath, 'utf-8');
            const sourceMapContent = JSON.parse(await fs.promises.readFile(sourceMapPath, 'utf-8')) as RawSourceMap;
            sourceMapContent.sourcesContent = ['abc'];

            const sourceProcessor = new SourceProcessor(new DebugIdGenerator());
            const result = await sourceProcessor.addSourcesToSourceMap(sourceMapContent, sourceMapPath, true);
            assert(result.isOk());

            expect(result.data.sourceMap.sourcesContent).toEqual([sourceContent]);
        });
    });

    describe('offsetSourceMap', () => {
        it('should offset sourcemap lines by count', async () => {
            const debugIdGenerator = new DebugIdGenerator();
            const sourceProcessor = new SourceProcessor(debugIdGenerator);
            const count = 3;

            const unmodifiedConsumer = await new SourceMapConsumer(sourceWithShebangMap);
            const expectedPosition = unmodifiedConsumer.originalPositionFor({
                line: 2,
                column: source.indexOf('foo();'),
            });

            const result = await sourceProcessor.offsetSourceMap(sourceWithShebangMap, count);

            const modifiedConsumer = await new SourceMapConsumer(result);
            const actualPosition = modifiedConsumer.originalPositionFor({
                line: 2 + count,
                column: source.indexOf('foo();'),
            });

            expect(actualPosition).toEqual(expectedPosition);
        });

        it('should modify only mappings', async () => {
            const debugIdGenerator = new DebugIdGenerator();
            const sourceProcessor = new SourceProcessor(debugIdGenerator);
            const count = 3;

            const sourceMap = {
                version: 3,
                file: Math.random().toString(),
                sources: [new Array(100)].map(() => Math.random().toString()),
                names: [new Array(100)].map(() => Math.random().toString()),
                mappings: 'AACA,SAASA,MACLC,QAAQC,IAAI,cAAc,CAC9B,CACAF,IAAI',
                foo: 'bar',
            };

            const result = await sourceProcessor.offsetSourceMap(sourceMap, count);
            expect(result).toEqual({ ...sourceMap, mappings: expect.any(String) });
            expect(result.mappings).not.toEqual(sourceMap.mappings);
        });
    });
});
