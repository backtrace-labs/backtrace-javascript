import { SourceProcessor, SymbolUploader } from '@backtrace/sourcemap-tools';
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import webpack from 'webpack';
import { asyncWebpack, expectSuccess, getFiles, removeDir, webpackModeTest } from './helpers';

export function createE2ETest(configBuilder: (mode: webpack.Configuration['mode']) => webpack.Configuration) {
    webpackModeTest((mode) => {
        function mockUploader() {
            return jest.spyOn(SymbolUploader.prototype, 'upload').mockImplementation((_, debugId) =>
                Promise.resolve({
                    debugId: debugId ?? crypto.randomUUID(),
                    rxid: crypto.randomUUID(),
                }),
            );
        }

        function mockProcessor() {
            return jest
                .spyOn(SourceProcessor.prototype, 'processSourceAndSourceMapFiles')
                .mockImplementation(async (_, __, debugId) => debugId ?? 'debugId');
        }

        let result: webpack.Stats;
        let uploadSpy: ReturnType<typeof mockUploader>;
        let processSpy: ReturnType<typeof mockProcessor>;

        beforeAll(async () => {
            jest.resetAllMocks();

            uploadSpy = mockUploader();
            processSpy = mockProcessor();

            const config = configBuilder(mode);
            if (config.output?.path) {
                await removeDir(config.output.path);
            }

            const webpackResult = await asyncWebpack(config);
            expectSuccess(webpackResult);
            result = webpackResult;
        }, 120000);

        it('should call SourceProcessor for every emitted source file and sourcemap pair', async () => {
            const outputDir = result.compilation.outputOptions.path;
            assert(outputDir);

            const jsFiles = await getFiles(outputDir, /.js$/);
            expect(jsFiles.length).toBeGreaterThan(0);

            const processedPairs = processSpy.mock.calls.map(
                ([p1, p2]) => [path.resolve(p1), path.resolve(p2)] as const,
            );
            for (const file of jsFiles) {
                const content = await fs.promises.readFile(file, 'utf8');
                const matches = [...content.matchAll(/^\/\/# sourceMappingURL=(.+)$/gm)];
                expect(matches.length).toEqual(1);
                const [, sourceMapPath] = matches[0];

                expect(processedPairs).toContainEqual([
                    path.resolve(file),
                    path.resolve(path.dirname(file), sourceMapPath),
                ]);
            }
        });

        it('should call SourceMapUploader for every emitted sourcemap', async () => {
            const outputDir = result.compilation.outputOptions.path;
            assert(outputDir);

            const mapFiles = await getFiles(outputDir, /.js.map$/);
            expect(mapFiles.length).toBeGreaterThan(0);

            const uploadedFiles = uploadSpy.mock.calls.map((c) => path.resolve(c[0]));
            for (const file of mapFiles) {
                expect(uploadedFiles).toContain(path.resolve(file));
            }
        });
    });
}
