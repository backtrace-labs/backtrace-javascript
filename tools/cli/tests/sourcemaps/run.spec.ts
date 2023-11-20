import { Ok } from '@backtrace/sourcemap-tools';
import assert from 'assert';
import { randomUUID } from 'crypto';
import fs from 'fs';
import { glob } from 'glob';
import path from 'path';
import { CliLogger } from '../../src/logger';
import { CliOptions } from '../../src/options/models/CliOptions';
import * as addSourcesCmd from '../../src/sourcemaps/add-sources';
import * as processCmd from '../../src/sourcemaps/process';
import { runSourcemapCommands } from '../../src/sourcemaps/run';
import * as uploadCmd from '../../src/sourcemaps/upload';
import { getHelpMessage, mockUploader } from '../_helpers/common';
import { hashFiles, withWorkingCopy } from '../_helpers/testFiles';

async function mockOptions(workingDir: string, options: CliOptions) {
    const configName = `${randomUUID()}.backtracejsrc`;
    const fullPath = path.join(workingDir, configName);
    await fs.promises.writeFile(fullPath, JSON.stringify(options));
    return fullPath;
}

describe('run', () => {
    beforeEach(() => {
        mockUploader();
    });

    describe('returning values', () => {
        it(
            'should return processed sources and sourcemap paths',
            withWorkingCopy('original', async (workingDir) => {
                const config = await mockOptions(workingDir, {
                    run: {
                        'add-sources': true,
                        process: true,
                        upload: true,
                    },
                    upload: {
                        url: 'https://test',
                    },
                });

                const result = await runSourcemapCommands({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                        config,
                    },
                });

                assert(result.isOk(), result.data as string);

                const expected = [...(await glob(`${workingDir}/*.js`)), ...(await glob(`${workingDir}/*.js.map`))];
                expect(result.data.flatMap((d) => [d.source.path, d.sourceMap.path])).toEqual(
                    expect.arrayContaining(expected),
                );
            }),
        );

        it(
            'should return only valid processed sources and sourcemap paths with asset-error-behavior=skip',
            withWorkingCopy(['invalid', 'original'], async (workingDir) => {
                const config = await mockOptions(workingDir, {
                    run: {
                        'add-sources': true,
                        process: true,
                        upload: true,
                        'asset-error-behavior': 'skip',
                    },
                    upload: {
                        url: 'https://test',
                    },
                });

                const result = await runSourcemapCommands({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                        config,
                    },
                });

                assert(result.isOk(), result.data as string);

                const expected = [
                    ...(await glob(`${workingDir}/entry*.js`)),
                    ...(await glob(`${workingDir}/entry*.js.map`)),
                ];
                expect(result.data.flatMap((d) => [d.source.path, d.sourceMap.path])).toEqual(
                    expect.arrayContaining(expected),
                );
            }),
        );
    });

    describe('commands', () => {
        it(
            'should call process when process=true',
            withWorkingCopy('original', async (workingDir) => {
                const config = await mockOptions(workingDir, {
                    run: {
                        'add-sources': true,
                        process: true,
                        upload: true,
                    },
                    upload: {
                        url: 'https://test',
                    },
                });

                const processSpy = jest.spyOn(processCmd, 'processSource');
                processSpy.mockClear();

                const result = await runSourcemapCommands({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                        config,
                    },
                });

                assert(result.isOk(), result.data as string);
                expect(processSpy).toBeCalled();
            }),
        );

        it(
            'should call process with every source when process=true',
            withWorkingCopy('original', async (workingDir) => {
                const config = await mockOptions(workingDir, {
                    run: {
                        'add-sources': true,
                        process: true,
                        upload: true,
                    },
                    upload: {
                        url: 'https://test',
                    },
                });

                type InnerProcess = ReturnType<typeof processCmd.processSource>;
                const innerProcess = jest
                    .fn<ReturnType<InnerProcess>, Parameters<InnerProcess>>()
                    .mockImplementation((asset) =>
                        Promise.resolve({
                            source: asset.source,
                            sourceMap: {
                                ...asset.sourceMap,
                                content: { ...asset.sourceMap.content, debugId: 'debugId' },
                            },
                            debugId: 'debugId',
                        }),
                    );

                const processSpy = jest.spyOn(processCmd, 'processSource').mockReturnValue(innerProcess);
                processSpy.mockClear();

                const result = await runSourcemapCommands({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                        config,
                    },
                });

                assert(result.isOk(), result.data as string);

                const files = await glob(`${workingDir}/*.js`);
                for (const file of files) {
                    expect(innerProcess).toBeCalledWith(
                        expect.objectContaining({ source: expect.objectContaining({ path: file }) }),
                    );
                }
            }),
        );

        it(
            'should not call process when process=false',
            withWorkingCopy('processed', async (workingDir) => {
                const config = await mockOptions(workingDir, {
                    run: {
                        'add-sources': true,
                        process: false,
                        upload: true,
                    },
                    upload: {
                        url: 'https://test',
                    },
                });

                const processSpy = jest.spyOn(processCmd, 'processSources');
                processSpy.mockClear();

                const result = await runSourcemapCommands({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                        config,
                    },
                });

                assert(result.isOk(), result.data as string);
                expect(processSpy).not.toBeCalled();
            }),
        );

        it(
            'should call add-sources when add-sources=true',
            withWorkingCopy('original', async (workingDir) => {
                const config = await mockOptions(workingDir, {
                    run: {
                        'add-sources': true,
                        process: true,
                        upload: true,
                    },
                    upload: {
                        url: 'https://test',
                    },
                });

                const addSourcesSpy = jest.spyOn(addSourcesCmd, 'addSourceToSourceMap');
                addSourcesSpy.mockClear();

                const result = await runSourcemapCommands({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                        config,
                    },
                });

                assert(result.isOk(), result.data as string);
                expect(addSourcesSpy).toBeCalled();
            }),
        );

        it(
            'should call add-sources with every sourcemap when add-sources=true',
            withWorkingCopy('original', async (workingDir) => {
                const config = await mockOptions(workingDir, {
                    run: {
                        'add-sources': true,
                        process: true,
                        upload: true,
                    },
                    upload: {
                        url: 'https://test',
                    },
                });

                type InnerAddSources = ReturnType<typeof addSourcesCmd.addSourceToSourceMap>;
                const innerAddSources = jest
                    .fn<ReturnType<InnerAddSources>, Parameters<InnerAddSources>>()
                    .mockImplementation((asset) => Promise.resolve(Ok(asset)));

                const addSourcesSpy = jest
                    .spyOn(addSourcesCmd, 'addSourceToSourceMap')
                    .mockReturnValue(innerAddSources);
                addSourcesSpy.mockClear();

                const result = await runSourcemapCommands({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                        config,
                    },
                });

                assert(result.isOk(), result.data as string);

                const files = await glob(`${workingDir}/*.js.map`);
                for (const file of files) {
                    expect(innerAddSources).toBeCalledWith(expect.objectContaining({ path: file }));
                }
            }),
        );

        it(
            'should not call add-sources when add-sources=false',
            withWorkingCopy('original', async (workingDir) => {
                const config = await mockOptions(workingDir, {
                    run: {
                        'add-sources': false,
                        process: true,
                        upload: true,
                    },
                    upload: {
                        url: 'https://test',
                    },
                });

                const addSourcesSpy = jest.spyOn(addSourcesCmd, 'addSourcesToSourcemaps');
                addSourcesSpy.mockClear();

                const result = await runSourcemapCommands({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                        config,
                    },
                });

                assert(result.isOk(), result.data as string);
                expect(addSourcesSpy).not.toBeCalled();
            }),
        );

        it(
            'should call upload when upload=true',
            withWorkingCopy('original', async (workingDir) => {
                const config = await mockOptions(workingDir, {
                    run: {
                        'add-sources': true,
                        process: true,
                        upload: true,
                    },
                    upload: {
                        url: 'https://test',
                    },
                });

                const uploadSpy = jest.spyOn(uploadCmd, 'uploadOrSaveAssets');
                uploadSpy.mockClear();

                const result = await runSourcemapCommands({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                        config,
                    },
                });

                assert(result.isOk(), result.data as string);
                expect(uploadSpy).toBeCalled();
            }),
        );

        it(
            'should not call upload when upload=false',
            withWorkingCopy('original', async (workingDir) => {
                const config = await mockOptions(workingDir, {
                    run: {
                        'add-sources': true,
                        process: true,
                        upload: false,
                    },
                    upload: {
                        url: 'https://test',
                    },
                });

                const uploadSpy = jest.spyOn(uploadCmd, 'uploadOrSaveAssets');
                uploadSpy.mockClear();

                const result = await runSourcemapCommands({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                        config,
                    },
                });

                assert(result.isOk(), result.data as string);
                expect(uploadSpy).not.toBeCalled();
            }),
        );

        it(
            'should fail when none commands are enabled',
            withWorkingCopy('original', async (workingDir) => {
                const config = await mockOptions(workingDir, {
                    run: {
                        'add-sources': false,
                        process: false,
                        upload: false,
                    },
                });

                const result = await runSourcemapCommands({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                        config,
                    },
                });

                assert(result.isErr(), 'result should be an error');
                expect(result.data).toEqual('--process, --add-sources and/or --upload must be specified');
            }),
        );
    });

    describe('invalid files', () => {
        it(
            'should fail with first invalid file',
            withWorkingCopy('invalid', async (workingDir) => {
                const config = await mockOptions(workingDir, {
                    run: {
                        'add-sources': true,
                        process: true,
                        upload: true,
                    },
                    upload: {
                        url: 'https://test',
                    },
                });

                const result = await runSourcemapCommands({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                        config,
                    },
                });

                assert(result.isErr(), 'result should be an error');
                expect(result.data).toMatch(/invalid1\.js/);
            }),
        );

        it(
            'should not change anything with invalid files',
            withWorkingCopy('invalid', async (workingDir) => {
                const files = await glob(`${workingDir}/*`);
                const expected = await hashFiles(files);

                const config = await mockOptions(workingDir, {
                    run: {
                        'add-sources': true,
                        process: true,
                        upload: true,
                    },
                    upload: {
                        url: 'https://test',
                    },
                });

                const result = await runSourcemapCommands({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                        config,
                    },
                });

                assert(result.isErr(), 'result should be an error');

                const actual = await hashFiles(files);
                expect(actual).toEqual(expected);
            }),
        );
    });

    describe('not linked sourcemaps', () => {
        it(
            'should return processed sources and sourcemap paths',
            withWorkingCopy('not-linked-sourcemaps', async (workingDir) => {
                const config = await mockOptions(workingDir, {
                    run: {
                        'add-sources': true,
                        process: true,
                        upload: true,
                    },
                    upload: {
                        url: 'https://test',
                    },
                });

                const result = await runSourcemapCommands({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                        config,
                    },
                });

                assert(result.isOk(), result.data as string);

                const expected = [...(await glob(`${workingDir}/*.js`)), ...(await glob(`${workingDir}/*.js.map`))];
                expect(result.data.flatMap((d) => [d.source.path, d.sourceMap.path])).toEqual(
                    expect.arrayContaining(expected),
                );
            }),
        );
    });

    describe('directory linked sourcemaps', () => {
        it(
            'should return processed sources and sourcemap paths',
            withWorkingCopy('directory-linked-sourcemaps', async (workingDir) => {
                const config = await mockOptions(workingDir, {
                    run: {
                        'add-sources': true,
                        process: true,
                        upload: true,
                    },
                    upload: {
                        url: 'https://test',
                    },
                });

                const result = await runSourcemapCommands({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                        config,
                    },
                });

                assert(result.isOk(), result.data as string);

                const expected = [...(await glob(`${workingDir}/*.js`)), ...(await glob(`${workingDir}/*.js.map`))];
                expect(result.data.flatMap((d) => [d.source.path, d.sourceMap.path])).toEqual(
                    expect.arrayContaining(expected),
                );
            }),
        );
    });

    describe('tuple paths', () => {
        it(
            'should return processed sources and sourcemap paths',
            withWorkingCopy('not-linked-different-name-sourcemaps', async (workingDir) => {
                const entry1Path = `${workingDir}/entry1.js`;
                const entry2Path = `${workingDir}/entry2.js`;
                const sourcemap1Path = `${workingDir}/sourcemap1.js.map`;
                const sourcemap2Path = `${workingDir}/sourcemap2.js.map`;

                const config = await mockOptions(workingDir, {
                    run: {
                        'add-sources': true,
                        process: true,
                        upload: true,
                    },
                    upload: {
                        url: 'https://test',
                    },
                });

                const result = await runSourcemapCommands({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: [`${entry1Path}:${sourcemap1Path}`, `${entry2Path}:${sourcemap2Path}`],
                        config,
                    },
                });

                assert(result.isOk(), result.data as string);

                const expected = [entry1Path, entry2Path, sourcemap1Path, sourcemap2Path];
                expect(result.data.flatMap((d) => [d.source.path, d.sourceMap.path])).toEqual(
                    expect.arrayContaining(expected),
                );
            }),
        );
    });
});
