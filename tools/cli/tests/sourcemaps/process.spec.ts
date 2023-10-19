import { SourceProcessor } from '@backtrace-labs/sourcemap-tools';
import assert from 'assert';
import { glob } from 'glob';
import { CliLogger } from '../../src/logger';
import { processSources } from '../../src/sourcemaps/process';
import { expectAllKeysToChange, filterKeys, getHelpMessage } from '../_helpers/common';
import { expectHashesToChange, hashEachFile, hashFiles, readEachFile, withWorkingCopy } from '../_helpers/testFiles';

describe('process', () => {
    describe('returning value', () => {
        it(
            'should return processed sources',
            withWorkingCopy('original', async (workingDir) => {
                const result = await processSources({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                    },
                });

                assert(result.isOk(), result.data as string);

                const expected = await glob(`${workingDir}/*.js`);
                expect(result.data.map((d) => d.source.path)).toEqual(expect.arrayContaining(expected));
            }),
        );

        it(
            'should return only valid processed sources with asset-error-behavior=skip',
            withWorkingCopy(['invalid', 'original'], async (workingDir) => {
                const result = await processSources({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                        'asset-error-behavior': 'skip',
                    },
                });

                assert(result.isOk(), result.data as string);

                const expected = await glob(`${workingDir}/entry*.js`);
                expect(result.data.map((d) => d.source.path)).toEqual(expect.arrayContaining(expected));
            }),
        );
    });

    describe('unprocessed sources', () => {
        it(
            'should not fail',
            withWorkingCopy('original', async (workingDir) => {
                const result = await processSources({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                    },
                });

                assert(result.isOk(), result.data as string);
            }),
        );

        it(
            'should call SourceProcessor with sources',
            withWorkingCopy('original', async (workingDir) => {
                const spy = jest.spyOn(SourceProcessor.prototype, 'processSourceAndSourceMap');

                const files = await glob(`${workingDir}/*.js`);
                const originalSources = await readEachFile(files);

                const result = await processSources({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                    },
                });

                assert(result.isOk(), result.data as string);

                for (const source of Object.values(originalSources)) {
                    expect(spy).toBeCalledWith(source, expect.anything());
                }
            }),
        );

        it(
            'should modify sources in place',
            withWorkingCopy('original', async (workingDir) => {
                const preHashes = await hashEachFile(await glob(`${workingDir}/*.js`));

                const result = await processSources({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                    },
                });

                assert(result.isOk(), result.data as string);
                const postHashes = await hashEachFile(await glob(`${workingDir}/*.js`));

                expectHashesToChange(preHashes, postHashes);
            }),
        );

        it(
            'should modify sourcemaps in place',
            withWorkingCopy('original', async (workingDir) => {
                const preHashes = await hashEachFile(await glob(`${workingDir}/*.js.map`));

                const result = await processSources({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                    },
                });

                assert(result.isOk(), result.data as string);
                const postHashes = await hashEachFile(await glob(`${workingDir}/*.js.map`));

                expectHashesToChange(preHashes, postHashes);
            }),
        );
    });

    describe('no matching sources', () => {
        it('should fail with no sources found', async () => {
            const result = await processSources({
                logger: new CliLogger({ level: 'output', silent: true }),
                getHelpMessage,
                opts: {
                    path: '*.nope_does_not_exist',
                },
            });

            assert(result.isErr(), 'result should be an error');
            expect(result.data).toEqual('no source files found');
        });

        it('should not fail when pass-with-no-files is true', async () => {
            const result = await processSources({
                logger: new CliLogger({ level: 'output', silent: true }),
                getHelpMessage,
                opts: {
                    path: '*.nope_does_not_exist',
                    'pass-with-no-files': true,
                },
            });

            assert(result.isOk(), result.data as string);
        });
    });

    describe('already processed sources', () => {
        it(
            'should not fail',
            withWorkingCopy('processed', async (workingDir) => {
                const result = await processSources({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                    },
                });

                assert(result.isOk(), result.data as string);
            }),
        );

        it(
            'should call SourceProcessor with sources with force',
            withWorkingCopy('processed', async (workingDir) => {
                const spy = jest.spyOn(SourceProcessor.prototype, 'processSourceAndSourceMap');

                const files = await glob(`${workingDir}/*.js`);
                const originalSources = await readEachFile(files);

                const result = await processSources({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                        force: true,
                    },
                });

                assert(result.isOk(), result.data as string);

                for (const source of Object.values(originalSources)) {
                    expect(spy).toBeCalledWith(source, expect.anything());
                }
            }),
        );

        it(
            'should modify valid sources and sourcemaps in place with force',
            withWorkingCopy('processed', async (workingDir) => {
                const preHashes = await hashEachFile(await glob(`${workingDir}/entry*.*`));
                const result = await processSources({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                        force: true,
                    },
                });

                assert(result.isOk(), result.data as string);
                const postHashes = await hashEachFile(await glob(`${workingDir}/entry*.*`));

                expectHashesToChange(preHashes, postHashes);
            }),
        );
    });

    describe('dry run', () => {
        it(
            'should not modify content',
            withWorkingCopy('original', async (workingDir) => {
                const files = await glob(`${workingDir}/*`);
                const expected = await hashFiles(files);

                const result = await processSources({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                        'dry-run': true,
                    },
                });

                assert(result.isOk(), result.data as string);

                const actual = await hashFiles(files);
                expect(actual).toEqual(expected);
            }),
            20000,
        );
    });

    describe('invalid files', () => {
        it(
            'should fail with first invalid file',
            withWorkingCopy('invalid', async (workingDir) => {
                const result = await processSources({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                    },
                });

                assert(result.isErr(), 'result should be an error');
                expect(result.data).toMatch(/invalid1\.js/);
            }),
        );

        it(
            'should not modify invalid files',
            withWorkingCopy('invalid', async (workingDir) => {
                const files = await glob(`${workingDir}/*`);
                const expected = await hashFiles(files);

                const result = await processSources({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: [workingDir],
                    },
                });

                assert(result.isErr(), 'result should be an error');

                const actual = await hashFiles(files);
                expect(actual).toEqual(expected);
            }),
        );

        it(
            'should modify other than invalid files',
            withWorkingCopy(['invalid', 'original'], async (workingDir) => {
                const files = await glob(`${workingDir}/*`);
                const preHash = await hashEachFile(files);
                const expected = filterKeys(preHash, (k) => !k.includes('invalid'));

                const result = await processSources({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: [workingDir],
                    },
                });

                assert(result.isErr(), 'result should be an error');

                const postHash = await hashEachFile(files);
                const actual = filterKeys(postHash, (k) => !k.includes('invalid'));
                expectAllKeysToChange(actual, expected);
            }),
        );

        it(
            'should not fail with asset-error-behavior=skip',
            withWorkingCopy('invalid', async (workingDir) => {
                const result = await processSources({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                        'asset-error-behavior': 'skip',
                    },
                });

                assert(result.isOk(), result.data as string);
            }),
        );

        it(
            'should modify valid sources and sourcemaps in place with asset-error-behavior=skip',
            withWorkingCopy(['invalid', 'original'], async (workingDir) => {
                const preHashes = await hashEachFile(await glob(`${workingDir}/entry*.*`));
                const result = await processSources({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                        'asset-error-behavior': 'skip',
                    },
                });

                assert(result.isOk(), result.data as string);
                const postHashes = await hashEachFile(await glob(`${workingDir}/entry*.*`));

                expectHashesToChange(preHashes, postHashes);
            }),
        );
    });

    describe('not linked sourcemaps', () => {
        it(
            'should not fail',
            withWorkingCopy('not-linked-sourcemaps', async (workingDir) => {
                const result = await processSources({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                    },
                });

                assert(result.isOk(), result.data as string);
            }),
        );

        it(
            'should call SourceProcessor with sources',
            withWorkingCopy('not-linked-sourcemaps', async (workingDir) => {
                const spy = jest.spyOn(SourceProcessor.prototype, 'processSourceAndSourceMap');

                const files = await glob(`${workingDir}/*.js`);
                const originalSources = await readEachFile(files);

                const result = await processSources({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                    },
                });

                assert(result.isOk(), result.data as string);

                for (const source of Object.values(originalSources)) {
                    expect(spy).toBeCalledWith(source, expect.anything());
                }
            }),
        );

        it(
            'should modify sources in place',
            withWorkingCopy('not-linked-sourcemaps', async (workingDir) => {
                const preHashes = await hashEachFile(await glob(`${workingDir}/*.js`));

                const result = await processSources({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                    },
                });

                assert(result.isOk(), result.data as string);
                const postHashes = await hashEachFile(await glob(`${workingDir}/*.js`));

                expectHashesToChange(preHashes, postHashes);
            }),
        );

        it(
            'should modify sourcemaps in place',
            withWorkingCopy('not-linked-sourcemaps', async (workingDir) => {
                const preHashes = await hashEachFile(await glob(`${workingDir}/*.js.map`));

                const result = await processSources({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                    },
                });

                assert(result.isOk(), result.data as string);
                const postHashes = await hashEachFile(await glob(`${workingDir}/*.js.map`));

                expectHashesToChange(preHashes, postHashes);
            }),
        );
    });

    describe('directory linked sourcemaps', () => {
        it(
            'should not fail',
            withWorkingCopy('directory-linked-sourcemaps', async (workingDir) => {
                const result = await processSources({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                    },
                });

                assert(result.isOk(), result.data as string);
            }),
        );

        it(
            'should call SourceProcessor with sources',
            withWorkingCopy('directory-linked-sourcemaps', async (workingDir) => {
                const spy = jest.spyOn(SourceProcessor.prototype, 'processSourceAndSourceMap');

                const files = await glob(`${workingDir}/*.js`);
                const originalSources = await readEachFile(files);

                const result = await processSources({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                    },
                });

                assert(result.isOk(), result.data as string);

                for (const source of Object.values(originalSources)) {
                    expect(spy).toBeCalledWith(source, expect.anything());
                }
            }),
        );

        it(
            'should modify sources in place',
            withWorkingCopy('directory-linked-sourcemaps', async (workingDir) => {
                const preHashes = await hashEachFile(await glob(`${workingDir}/*.js`));

                const result = await processSources({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                    },
                });

                assert(result.isOk(), result.data as string);
                const postHashes = await hashEachFile(await glob(`${workingDir}/*.js`));

                expectHashesToChange(preHashes, postHashes);
            }),
        );

        it(
            'should modify sourcemaps in place',
            withWorkingCopy('directory-linked-sourcemaps', async (workingDir) => {
                const preHashes = await hashEachFile(await glob(`${workingDir}/*.js.map`));

                const result = await processSources({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                    },
                });

                assert(result.isOk(), result.data as string);
                const postHashes = await hashEachFile(await glob(`${workingDir}/*.js.map`));

                expectHashesToChange(preHashes, postHashes);
            }),
        );
    });
});
