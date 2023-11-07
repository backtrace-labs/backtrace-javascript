import { RawSourceMap, ZipArchive } from '@backtrace/sourcemap-tools';
import assert from 'assert';
import { randomUUID } from 'crypto';
import fs from 'fs';
import { glob } from 'glob';
import path from 'path';
import { CliLogger } from '../../src/logger';
import { uploadSourcemaps } from '../../src/sourcemaps/upload';
import { getHelpMessage, mockUploader } from '../_helpers/common';
import { withWorkingCopy } from '../_helpers/testFiles';

describe('upload', () => {
    beforeEach(() => {
        mockUploader();
    });

    describe('returning value', () => {
        it(
            'should return rxid result',
            withWorkingCopy('processed', async (workingDir) => {
                const rxid = randomUUID();
                mockUploader(rxid);

                const result = await uploadSourcemaps({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                        url: 'https://test',
                    },
                });

                assert(result.isOk(), result.data as string);
                expect(result.data.rxid).toEqual(rxid);
            }),
        );

        it(
            'should return archive output result',
            withWorkingCopy('processed', async (workingDir) => {
                const outputName = `${workingDir}/${randomUUID()}.tar.gz`;
                const result = await uploadSourcemaps({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                        output: outputName,
                    },
                });

                assert(result.isOk(), result.data as string);
                expect(result.data.rxid).toEqual(outputName);
            }),
        );
    });

    describe('processed sourcemaps', () => {
        it(
            'should not fail',
            withWorkingCopy('processed', async (workingDir) => {
                const result = await uploadSourcemaps({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                        url: 'https://test',
                    },
                });

                assert(result.isOk(), result.data as string);
            }),
        );

        it(
            'should append sourcemaps to archive',
            withWorkingCopy('processed', async (workingDir) => {
                const appendSpy = jest.spyOn(ZipArchive.prototype, 'append');
                appendSpy.mockClear();

                const result = await uploadSourcemaps({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                        url: 'https://test',
                    },
                });

                assert(result.isOk(), result.data as string);

                const files = await glob(`${workingDir}/*.js.map`);
                for (const file of files) {
                    expect(appendSpy).toHaveBeenCalledWith(
                        expect.stringContaining(path.basename(file)),
                        expect.anything(),
                    );
                }
            }),
        );

        it(
            'should call upload',
            withWorkingCopy('processed', async (workingDir) => {
                const uploadSpy = mockUploader();
                uploadSpy.mockClear();

                const result = await uploadSourcemaps({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                        url: 'https://test',
                    },
                });

                assert(result.isOk(), result.data as string);
                expect(uploadSpy).toBeCalled();
            }),
        );

        it(
            'should append sourcemaps without sources to archive',
            withWorkingCopy('processed-with-sources', async (workingDir) => {
                const appendSpy = jest.spyOn(ZipArchive.prototype, 'append');
                appendSpy.mockClear();

                const result = await uploadSourcemaps({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                        url: 'https://test',
                    },
                });

                assert(result.isOk(), result.data as string);

                expect(appendSpy).toBeCalled();
                for (const call of appendSpy.mock.calls) {
                    const sourceMap = JSON.parse(call[1]) as RawSourceMap;
                    expect(sourceMap.sourcesContent).toBeUndefined();
                }
            }),
        );
    });

    describe('no matching sourcemaps', () => {
        it('should fail with no sourcemaps found', async () => {
            const result = await uploadSourcemaps({
                logger: new CliLogger({ level: 'output', silent: true }),
                getHelpMessage,
                opts: {
                    path: '*.nope_does_not_exist',
                    url: 'https://test',
                },
            });

            assert(result.isErr(), 'result should be an error');
            expect(result.data).toEqual('no sourcemaps found');
        });

        it('should not fail when pass-with-no-files is true', async () => {
            const result = await uploadSourcemaps({
                logger: new CliLogger({ level: 'output', silent: true }),
                getHelpMessage,
                opts: {
                    path: '*.nope_does_not_exist',
                    url: 'https://test',
                    'pass-with-no-files': true,
                },
            });

            assert(result.isOk(), result.data as string);
        });

        it('should not call upload when pass-with-no-files is true', async () => {
            const uploadSpy = mockUploader();
            uploadSpy.mockClear();

            const result = await uploadSourcemaps({
                logger: new CliLogger({ level: 'output', silent: true }),
                getHelpMessage,
                opts: {
                    path: '*.nope_does_not_exist',
                    url: 'https://test',
                    'pass-with-no-files': true,
                },
            });

            assert(result.isOk(), result.data as string);
            expect(uploadSpy).not.toBeCalled();
        });

        it('should return <no sourcemaps uploaded> as rxid when pass-with-no-files is true', async () => {
            const result = await uploadSourcemaps({
                logger: new CliLogger({ level: 'output', silent: true }),
                getHelpMessage,
                opts: {
                    path: '*.nope_does_not_exist',
                    url: 'https://test',
                    'pass-with-no-files': true,
                },
            });

            assert(result.isOk(), result.data as string);
            expect(result.data.rxid).toEqual('<no sourcemaps uploaded>');
        });
    });

    describe('unprocessed sourcemaps', () => {
        it(
            'should fail with no sourcemaps found',
            withWorkingCopy('original', async (workingDir) => {
                const result = await uploadSourcemaps({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                        url: 'https://test',
                    },
                });

                assert(result.isErr(), 'result should be an error');
                expect(result.data).toEqual('no processed sourcemaps found, make sure to run process first');
            }),
        );
    });

    describe('dry run', () => {
        it(
            'should not call upload',
            withWorkingCopy('processed', async (workingDir) => {
                const uploadSpy = mockUploader();
                uploadSpy.mockClear();

                const result = await uploadSourcemaps({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                        url: 'https://test',
                        'dry-run': true,
                    },
                });

                assert(result.isOk(), result.data as string);
                expect(uploadSpy).not.toBeCalled();
            }),
        );
        it(
            'should return <dry-run> as rxid',
            withWorkingCopy('processed', async (workingDir) => {
                const result = await uploadSourcemaps({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                        url: 'https://test',
                        'dry-run': true,
                    },
                });

                assert(result.isOk(), result.data as string);
                expect(result.data.rxid).toEqual('<dry-run>');
            }),
        );
    });

    describe('sourcemaps resolved from sources', () => {
        it(
            'should not fail',
            withWorkingCopy('processed', async (workingDir) => {
                const result = await uploadSourcemaps({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: `${workingDir}/*.js`,
                        url: 'https://test',
                    },
                });

                assert(result.isOk(), result.data as string);
            }),
        );

        it(
            'should append sourcemaps to archive',
            withWorkingCopy('processed', async (workingDir) => {
                const appendSpy = jest.spyOn(ZipArchive.prototype, 'append');
                appendSpy.mockClear();

                const result = await uploadSourcemaps({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: `${workingDir}/*.js`,
                        url: 'https://test',
                    },
                });

                assert(result.isOk(), result.data as string);

                const files = await glob(`${workingDir}/*.js.map`);
                for (const file of files) {
                    expect(appendSpy).toHaveBeenCalledWith(
                        expect.stringContaining(path.basename(file)),
                        expect.anything(),
                    );
                }
            }),
        );
    });

    describe('include sources', () => {
        it(
            'should append sourcemaps with sources to archive',
            withWorkingCopy('processed-with-sources', async (workingDir) => {
                const appendSpy = jest.spyOn(ZipArchive.prototype, 'append');
                appendSpy.mockClear();

                const result = await uploadSourcemaps({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                        url: 'https://test',
                        'include-sources': true,
                    },
                });

                assert(result.isOk(), result.data as string);

                expect(appendSpy).toBeCalled();
                for (const call of appendSpy.mock.calls) {
                    const sourceMap = JSON.parse(call[1]) as RawSourceMap;
                    expect(sourceMap.sourcesContent?.length).toBeGreaterThan(0);
                }
            }),
        );
    });

    describe('output archive to file', () => {
        it(
            'should create archive',
            withWorkingCopy('processed', async (workingDir) => {
                const output = `${workingDir}/archive.tar.gz`;

                const result = await uploadSourcemaps({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                        output,
                    },
                });

                assert(result.isOk(), result.data as string);

                const stat = await fs.promises.stat(output);
                expect(stat.isFile()).toEqual(true);
            }),
        );

        it(
            'should not call upload when output is specified',
            withWorkingCopy('processed', async (workingDir) => {
                const uploadSpy = mockUploader();
                uploadSpy.mockClear();

                const result = await uploadSourcemaps({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                        output: `${workingDir}/archive.tar.gz`,
                    },
                });

                assert(result.isOk(), result.data as string);
                expect(uploadSpy).not.toBeCalled();
            }),
        );

        it(
            'should not create archive when dry-run is specified',
            withWorkingCopy('processed', async (workingDir) => {
                const output = `${workingDir}/archive.tar.gz`;

                const result = await uploadSourcemaps({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                        output,
                        'dry-run': true,
                    },
                });

                assert(result.isOk(), result.data as string);
                expect(fs.existsSync(output)).toBe(false);
            }),
        );
    });

    describe('not linked processed sourcemaps', () => {
        it(
            'should not fail',
            withWorkingCopy('processed-not-linked-sourcemaps', async (workingDir) => {
                const result = await uploadSourcemaps({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: `${workingDir}/*.js`,
                        url: 'https://test',
                    },
                });

                assert(result.isOk(), result.data as string);
            }),
        );

        it(
            'should append sourcemaps to archive',
            withWorkingCopy('processed-not-linked-sourcemaps', async (workingDir) => {
                const appendSpy = jest.spyOn(ZipArchive.prototype, 'append');
                appendSpy.mockClear();

                const result = await uploadSourcemaps({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: `${workingDir}/*.js`,
                        url: 'https://test',
                    },
                });

                assert(result.isOk(), result.data as string);

                const files = await glob(`${workingDir}/*.js.map`);
                for (const file of files) {
                    expect(appendSpy).toHaveBeenCalledWith(
                        expect.stringContaining(path.basename(file)),
                        expect.anything(),
                    );
                }
            }),
        );

        it(
            'should call upload',
            withWorkingCopy('processed-not-linked-sourcemaps', async (workingDir) => {
                const uploadSpy = mockUploader();
                uploadSpy.mockClear();

                const result = await uploadSourcemaps({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: `${workingDir}/*.js`,
                        url: 'https://test',
                    },
                });

                assert(result.isOk(), result.data as string);
                expect(uploadSpy).toBeCalled();
            }),
        );
    });

    describe('directory linked processed sourcemaps', () => {
        it(
            'should not fail',
            withWorkingCopy('processed-directory-linked-sourcemaps', async (workingDir) => {
                const result = await uploadSourcemaps({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: `${workingDir}/*.js`,
                        url: 'https://test',
                    },
                });

                assert(result.isOk(), result.data as string);
            }),
        );

        it(
            'should append sourcemaps to archive',
            withWorkingCopy('processed-directory-linked-sourcemaps', async (workingDir) => {
                const appendSpy = jest.spyOn(ZipArchive.prototype, 'append');
                appendSpy.mockClear();

                const result = await uploadSourcemaps({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: `${workingDir}/*.js`,
                        url: 'https://test',
                    },
                });

                assert(result.isOk(), result.data as string);

                const files = await glob(`${workingDir}/*.js.map`);
                for (const file of files) {
                    expect(appendSpy).toHaveBeenCalledWith(
                        expect.stringContaining(path.basename(file)),
                        expect.anything(),
                    );
                }
            }),
        );

        it(
            'should call upload',
            withWorkingCopy('processed-directory-linked-sourcemaps', async (workingDir) => {
                const uploadSpy = mockUploader();
                uploadSpy.mockClear();

                const result = await uploadSourcemaps({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: `${workingDir}/*.js`,
                        url: 'https://test',
                    },
                });

                assert(result.isOk(), result.data as string);
                expect(uploadSpy).toBeCalled();
            }),
        );
    });

    describe('tuple paths', () => {
        it(
            'should not fail',
            withWorkingCopy('processed-not-linked-different-name-sourcemaps', async (workingDir) => {
                const result = await uploadSourcemaps({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: [
                            `${workingDir}/entry1.js:${workingDir}/sourcemap1.js.map`,
                            `${workingDir}/entry2.js:${workingDir}/sourcemap2.js.map`,
                        ],
                        url: 'https://test',
                    },
                });

                assert(result.isOk(), result.data as string);
            }),
        );

        it(
            'should append sourcemaps to archive',
            withWorkingCopy('processed-not-linked-different-name-sourcemaps', async (workingDir) => {
                const appendSpy = jest.spyOn(ZipArchive.prototype, 'append');
                appendSpy.mockClear();

                const result = await uploadSourcemaps({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: [
                            `${workingDir}/entry1.js:${workingDir}/sourcemap1.js.map`,
                            `${workingDir}/entry2.js:${workingDir}/sourcemap2.js.map`,
                        ],
                        url: 'https://test',
                    },
                });

                assert(result.isOk(), result.data as string);

                const files = await glob(`${workingDir}/*.js.map`);
                for (const file of files) {
                    expect(appendSpy).toHaveBeenCalledWith(
                        expect.stringContaining(path.basename(file)),
                        expect.anything(),
                    );
                }
            }),
        );

        it(
            'should call upload',
            withWorkingCopy('processed-not-linked-different-name-sourcemaps', async (workingDir) => {
                const uploadSpy = mockUploader();
                uploadSpy.mockClear();

                const result = await uploadSourcemaps({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: [
                            `${workingDir}/entry1.js:${workingDir}/sourcemap1.js.map`,
                            `${workingDir}/entry2.js:${workingDir}/sourcemap2.js.map`,
                        ],
                        url: 'https://test',
                    },
                });

                assert(result.isOk(), result.data as string);
                expect(uploadSpy).toBeCalled();
            }),
        );
    });
});
