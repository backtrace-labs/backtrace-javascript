import fs from 'fs';
import path from 'path';
import { SourceMapConsumer } from 'source-map';
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

    it('should append source snippet to the source on the first line', async () => {
        const expected = 'APPENDED_SOURCE';
        const debugIdGenerator = new DebugIdGenerator();

        jest.spyOn(debugIdGenerator, 'generateSourceSnippet').mockReturnValue(expected);

        const sourceProcessor = new SourceProcessor(debugIdGenerator);
        const result = await sourceProcessor.processSourceAndSourceMap(source, sourceMap);

        expect(result.source).toMatch(new RegExp(`^${expected}\n`));
    });

    it('should append comment snippet to the source on the last line', async () => {
        const expected = 'APPENDED_COMMENT';
        const debugIdGenerator = new DebugIdGenerator();

        jest.spyOn(debugIdGenerator, 'generateSourceComment').mockReturnValue(expected);

        const sourceProcessor = new SourceProcessor(debugIdGenerator);
        const result = await sourceProcessor.processSourceAndSourceMap(source, sourceMap);

        expect(result.source).toMatch(new RegExp(`\n${expected}$`));
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

        const unmodifiedConsumer = await new SourceMapConsumer(sourceMap);
        const expectedPosition = unmodifiedConsumer.originalPositionFor({ line: 1, column: source.indexOf('foo();') });

        const result = await sourceProcessor.processSourceAndSourceMap(source, sourceMap);

        const modifiedConsumer = await new SourceMapConsumer(result.sourceMap);
        const actualPosition = modifiedConsumer.originalPositionFor({
            line: 1 + expectedNewLineCount,
            column: source.indexOf('foo();'),
        });

        expect(actualPosition).toEqual(expectedPosition);
    });

    it('should call process function with content from files', async () => {
        const sourcePath = path.join(__dirname, './testFiles/source.js');
        const sourceMapPath = path.join(__dirname, './testFiles/source.js.map');
        const sourceContent = await fs.promises.readFile(sourcePath, 'utf-8');
        const sourceMapContent = await fs.promises.readFile(sourceMapPath, 'utf-8');
        const debugId = 'DEBUG_ID';

        const sourceProcessor = new SourceProcessor(new DebugIdGenerator());
        const processFn = jest
            .spyOn(sourceProcessor, 'processSourceAndSourceMap')
            .mockImplementation(async (_, __, debugId) => ({
                source: sourceContent,
                sourceMap: JSON.parse(sourceMapContent),
                debugId: debugId ?? 'debugId',
            }));

        await sourceProcessor.processSourceAndSourceMapFiles(sourcePath, sourceMapPath, debugId);

        expect(processFn).toBeCalledWith(sourceContent, sourceMapContent, debugId);
    });

    it('should call process function with sourcemap detected from source', async () => {
        const sourcePath = path.join(__dirname, './testFiles/source.js');
        const sourceMapPath = path.join(__dirname, './testFiles/source.js.map');
        const sourceContent = await fs.promises.readFile(sourcePath, 'utf-8');
        const sourceMapContent = await fs.promises.readFile(sourceMapPath, 'utf-8');
        const debugId = 'DEBUG_ID';

        const sourceProcessor = new SourceProcessor(new DebugIdGenerator());
        const processFn = jest
            .spyOn(sourceProcessor, 'processSourceAndSourceMap')
            .mockImplementation(async (_, __, debugId) => ({
                source: sourceContent,
                sourceMap: JSON.parse(sourceMapContent),
                debugId: debugId ?? 'debugId',
            }));

        await sourceProcessor.processSourceAndSourceMapFiles(sourcePath, undefined, debugId);

        expect(processFn).toBeCalledWith(sourceContent, sourceMapContent, debugId);
    });
});
