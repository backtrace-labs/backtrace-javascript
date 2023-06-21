import { SourceMapUploader } from '@backtrace/sourcemap-tools';
import assert from 'assert';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import webpack from 'webpack';
import {
    asyncWebpack,
    expectSourceComment,
    expectSourceMapSnippet,
    expectSourceSnippet,
    expectSuccess,
    getFiles,
    removeDir,
    webpackModeTest,
} from './helpers';

interface E2ETestOptions {
    testSourceFunction?: boolean;
    testSourceComment?: boolean;
    testSourceMap?: boolean;
    testSourceEval?: boolean;
    testSourceMapUpload?: boolean;
}

export function createE2ETest(
    configBuilder: (mode: webpack.Configuration['mode']) => webpack.Configuration,
    opts?: E2ETestOptions,
) {
    webpackModeTest((mode) => {
        function mockUploader() {
            return jest.spyOn(SourceMapUploader.prototype, 'upload').mockImplementation((_, debugId) =>
                Promise.resolve({
                    debugId: debugId ?? crypto.randomUUID(),
                    rxid: crypto.randomUUID(),
                }),
            );
        }

        let result: webpack.Stats;
        let uploadSpy: ReturnType<typeof mockUploader>;

        beforeAll(async () => {
            uploadSpy = mockUploader();

            const config = configBuilder(mode);
            if (config.output?.path) {
                await removeDir(config.output.path);
            }

            const webpackResult = await asyncWebpack(config);
            expectSuccess(webpackResult);
            result = webpackResult;
        }, 120000);

        if (opts?.testSourceFunction ?? true) {
            it('should inject function into emitted source files', async () => {
                const outputDir = result.compilation.outputOptions.path;
                assert(outputDir);

                const jsFiles = await getFiles(outputDir, /.js$/);
                expect(jsFiles.length).toBeGreaterThan(0);

                for (const file of jsFiles) {
                    const content = await fs.promises.readFile(file, 'utf8');
                    await expectSourceSnippet(content);
                }
            });
        }

        if (opts?.testSourceComment ?? true) {
            it('should inject debug ID comment into emitted source files', async () => {
                const outputDir = result.compilation.outputOptions.path;
                assert(outputDir);

                const jsFiles = await getFiles(outputDir, /.js$/);
                expect(jsFiles.length).toBeGreaterThan(0);

                for (const file of jsFiles) {
                    const content = await fs.promises.readFile(file, 'utf8');
                    await expectSourceComment(content);
                }
            });
        }

        if (opts?.testSourceEval ?? true) {
            it('should eval emitted source without syntax errors', async () => {
                const outputDir = result.compilation.outputOptions.path;
                assert(outputDir);

                const jsFiles = await getFiles(outputDir, /.js$/);
                expect(jsFiles.length).toBeGreaterThan(0);

                for (const file of jsFiles) {
                    const content = await fs.promises.readFile(file, 'utf8');
                    expect(() => eval(content)).not.toThrowError(SyntaxError);
                }
            });
        }

        if (opts?.testSourceMap ?? true) {
            it('should inject debug ID into emitted sourcemap files', async () => {
                const outputDir = result.compilation.outputOptions.path;
                assert(outputDir);

                const mapFiles = await getFiles(outputDir, /.js.map$/);
                expect(mapFiles.length).toBeGreaterThan(0);

                for (const file of mapFiles) {
                    const content = await fs.promises.readFile(file, 'utf8');
                    await expectSourceMapSnippet(content);
                }
            });

            if (opts?.testSourceMapUpload ?? true) {
                it('should upload sourcemaps using SourceMapUploader', async () => {
                    const outputDir = result.compilation.outputOptions.path;
                    assert(outputDir);

                    const mapFiles = await getFiles(outputDir, /.js.map$/);
                    expect(mapFiles.length).toBeGreaterThan(0);

                    const uploadedFiles = uploadSpy.mock.calls.map((c) => path.resolve(c[0]));
                    for (const file of mapFiles) {
                        expect(uploadedFiles).toContain(path.resolve(file));
                    }
                });
            }
        }
    });
}
