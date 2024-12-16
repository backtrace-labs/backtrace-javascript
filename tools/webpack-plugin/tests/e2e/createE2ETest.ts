import { Ok, SourceProcessor, SymbolUploader, ZipArchive } from '@backtrace/sourcemap-tools';
import assert from 'assert';
import crypto from 'crypto';
import path from 'path';
import { Readable } from 'stream';
import webpack from 'webpack';
import { asyncWebpack, expectSuccess, getFiles, removeDir, webpackModeTest } from './helpers';

export function createE2ETest(configBuilder: (mode: webpack.Configuration['mode']) => webpack.Configuration) {
    webpackModeTest((mode) => {
        function mockUploader() {
            return jest.spyOn(SymbolUploader.prototype, 'uploadSymbol').mockImplementation(() =>
                Promise.resolve(
                    Ok({
                        rxid: crypto.randomUUID(),
                    }),
                ),
            );
        }

        function mockProcessor() {
            return jest.spyOn(SourceProcessor.prototype, 'processSourceAndSourceMapFiles');
        }

        function mockZipArchiveAppend() {
            return jest.spyOn(ZipArchive.prototype, 'append').mockReturnThis();
        }

        let result: webpack.Stats;
        let uploadSpy: ReturnType<typeof mockUploader>;
        let processSpy: ReturnType<typeof mockProcessor>;
        let zipArchiveAppendSpy: ReturnType<typeof mockZipArchiveAppend>;

        beforeAll(async () => {
            jest.restoreAllMocks();

            uploadSpy = mockUploader();
            processSpy = mockProcessor();
            zipArchiveAppendSpy = mockZipArchiveAppend();

            const config = configBuilder(mode);
            if (config.output?.path) {
                await removeDir(config.output.path);
            }

            const webpackResult = await asyncWebpack(config);
            expectSuccess(webpackResult);
            result = webpackResult;
        }, 120000);

        it('should call SourceProcessor for every emitted source file', async () => {
            const outputDir = result.compilation.outputOptions.path;
            assert(outputDir);

            const jsFiles = await getFiles(outputDir, /.js$/);
            expect(jsFiles.length).toBeGreaterThan(0);

            const processedFiles = processSpy.mock.calls
                .map(([sourcePath]) => path.resolve(sourcePath))
                .sort((a, b) => a.localeCompare(b));

            expect(processedFiles).toEqual(jsFiles.sort((a, b) => a.localeCompare(b)));
        });

        it('should append every emitted sourcemap to archive', async () => {
            const outputDir = result.compilation.outputOptions.path;
            assert(outputDir);

            const mapFiles = (await getFiles(outputDir, /.js.map$/)).map((f) => path.basename(f));
            expect(mapFiles.length).toBeGreaterThan(0);

            const uploadedFiles = zipArchiveAppendSpy.mock.calls.map(([name]) => name);
            for (const file of mapFiles) {
                expect(uploadedFiles).toContainEqual(expect.stringContaining(file));
            }
        });

        it('should upload archive', async () => {
            expect(uploadSpy).toHaveBeenCalledWith(expect.any(Readable));
        });
    });
}
