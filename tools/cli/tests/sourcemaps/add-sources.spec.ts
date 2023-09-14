import { SourceProcessor } from '@backtrace-labs/sourcemap-tools';
import assert from 'assert';
import { glob } from 'glob';
import { CliLogger } from '../../src/logger';
import { addSourcesToSourcemaps } from '../../src/sourcemaps/add-sources';
import { expectAllKeysToChange, filterKeys, getHelpMessage } from '../_helpers/common';
import { expectHashesToChange, hashEachFile, hashFiles, withWorkingCopy } from '../_helpers/testFiles';

describe('add-sources', () => {
    describe('returning value', () => {
        it(
            'should return processed sourcemaps',
            withWorkingCopy('original', async (workingDir) => {
                const result = await addSourcesToSourcemaps({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                    },
                });

                assert(result.isOk(), result.data as string);

                const expected = await glob(`${workingDir}/*.js.map`);
                expect(result.data.map((d) => d.path)).toEqual(expect.arrayContaining(expected));
            }),
        );

        it(
            'should return only valid processed sourcemaps with asset-error-behavior=skip',
            withWorkingCopy(['invalid', 'original'], async (workingDir) => {
                const result = await addSourcesToSourcemaps({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                        'asset-error-behavior': 'skip',
                    },
                });

                assert(result.isOk(), result.data as string);

                const expected = await glob(`${workingDir}/entry*.js.map`);
                expect(result.data.map((d) => d.path)).toEqual(expect.arrayContaining(expected));
            }),
        );
    });

    describe('sourcemaps without sourcesContent', () => {
        it(
            'should not fail',
            withWorkingCopy('original', async (workingDir) => {
                const result = await addSourcesToSourcemaps({
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
            'should call SourceProcessor with sourcemap paths',
            withWorkingCopy('original', async (workingDir) => {
                const spy = jest.spyOn(SourceProcessor.prototype, 'addSourcesToSourceMap');

                const result = await addSourcesToSourcemaps({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                    },
                });

                assert(result.isOk(), result.data as string);
                const files = await glob(`${workingDir}/*.js.map`);

                for (const file of files) {
                    expect(spy).toBeCalledWith(expect.anything(), file);
                }
            }),
        );

        it(
            'should modify sourcesmaps in place',
            withWorkingCopy('original', async (workingDir) => {
                const preHashes = await hashEachFile(await glob(`${workingDir}/*.js.map`));

                const result = await addSourcesToSourcemaps({
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

    describe('no matching sourcemaps', () => {
        it('should fail with no sourcemaps found', async () => {
            const result = await addSourcesToSourcemaps({
                logger: new CliLogger({ level: 'output', silent: true }),
                getHelpMessage,
                opts: {
                    path: '*.nope_does_not_exist',
                },
            });

            assert(result.isErr(), 'result should be an error');
            expect(result.data).toEqual('no sourcemaps found');
        });

        it('should not fail when pass-with-no-files is true', async () => {
            const result = await addSourcesToSourcemaps({
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

    describe('sourcemaps with sourcesContent', () => {
        it(
            'should not fail',
            withWorkingCopy('with-sources', async (workingDir) => {
                const result = await addSourcesToSourcemaps({
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
            'should call SourceProcessor with sourcemaps with force',
            withWorkingCopy('with-sources', async (workingDir) => {
                const spy = jest.spyOn(SourceProcessor.prototype, 'addSourcesToSourceMap');

                const result = await addSourcesToSourcemaps({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                        force: true,
                    },
                });

                assert(result.isOk(), result.data as string);
                const files = await glob(`${workingDir}/*.js.map`);

                for (const file of files) {
                    expect(spy).toBeCalledWith(expect.anything(), file);
                }
            }),
        );

        it(
            'should modify sourcesmaps in place with force',
            withWorkingCopy('with-sources', async (workingDir) => {
                const preHashes = await hashEachFile(await glob(`${workingDir}/*.js.map`));

                const result = await addSourcesToSourcemaps({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                        force: true,
                    },
                });

                assert(result.isOk(), result.data as string);
                const postHashes = await hashEachFile(await glob(`${workingDir}/*.js.map`));

                expectHashesToChange(preHashes, postHashes);
            }),
        );
    });

    describe('sourcemaps resolved from sources', () => {
        it(
            'should not fail',
            withWorkingCopy('original', async (workingDir) => {
                const result = await addSourcesToSourcemaps({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: `${workingDir}/*.js`,
                    },
                });

                assert(result.isOk(), result.data as string);
            }),
        );

        it(
            'should call SourceProcessor with sourcemaps',
            withWorkingCopy('original', async (workingDir) => {
                const spy = jest.spyOn(SourceProcessor.prototype, 'addSourcesToSourceMap');
                const result = await addSourcesToSourcemaps({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: `${workingDir}/*.js`,
                    },
                });

                assert(result.isOk(), result.data as string);
                const files = await glob(`${workingDir}/*.js.map`);

                for (const file of files) {
                    expect(spy).toBeCalledWith(expect.anything(), file);
                }
            }),
        );
    });

    describe('dry run', () => {
        it(
            'should not modify content',
            withWorkingCopy('original', async (workingDir) => {
                const files = await glob(`${workingDir}/*`);
                const expected = await hashFiles(files);

                const result = await addSourcesToSourcemaps({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                        'dry-run': true,
                    },
                });

                assert(result.isOk(), 'add-sources failed');

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
                const result = await addSourcesToSourcemaps({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                    },
                });

                assert(result.isErr(), 'result should be an error');
                expect(result.data).toMatch(/invalid1\.js\.map/);
            }),
        );

        it(
            'should not modify invalid files',
            withWorkingCopy(['invalid', 'original'], async (workingDir) => {
                const files = await glob(`${workingDir}/*.js.map`);
                const preHash = await hashEachFile(files);
                const expected = filterKeys(preHash, (k) => k.includes('invalid'));

                const result = await addSourcesToSourcemaps({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: [workingDir],
                    },
                });

                assert(result.isErr(), 'result should be an error');

                const postHash = await hashEachFile(files);
                const actual = filterKeys(postHash, (k) => k.includes('invalid'));
                expect(expected).toEqual(actual);
            }),
        );

        it(
            'should modify other than invalid files',
            withWorkingCopy(['invalid', 'original'], async (workingDir) => {
                const files = await glob(`${workingDir}/*.js.map`);
                const preHash = await hashEachFile(files);
                const expected = filterKeys(preHash, (k) => !k.includes('invalid'));

                const result = await addSourcesToSourcemaps({
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
                const result = await addSourcesToSourcemaps({
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
            'should modify valid sourcemaps in place with asset-error-behavior=skip',
            withWorkingCopy(['invalid', 'original'], async (workingDir) => {
                const preHashes = await hashEachFile(await glob(`${workingDir}/entry*.js.map`));
                const result = await addSourcesToSourcemaps({
                    logger: new CliLogger({ level: 'output', silent: true }),
                    getHelpMessage,
                    opts: {
                        path: workingDir,
                        'asset-error-behavior': 'skip',
                    },
                });

                assert(result.isOk(), result.data as string);
                const postHashes = await hashEachFile(await glob(`${workingDir}/entry*.js.map`));

                expectHashesToChange(preHashes, postHashes);
            }),
        );
    });
});
