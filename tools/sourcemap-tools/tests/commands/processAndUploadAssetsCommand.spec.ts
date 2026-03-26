import fs from 'fs';
import os from 'os';
import path from 'path';
import {
    processAndUploadAssetsCommand,
    BacktracePluginOptions,
    ProcessAndUploadAssetsCommandOptions,
} from '../../src/commands/processAndUploadAssetsCommand';
import { Asset } from '../../src/models/Asset';

describe('processAndUploadAssetsCommand', () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bt-test-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    function createSourceFile(name: string, content?: string): string {
        const source = content ?? `function ${name.replace(/[^a-zA-Z]/g, '')}(){console.log("hello")}`;
        const filePath = path.join(tmpDir, name);
        fs.writeFileSync(filePath, source);
        return filePath;
    }

    function createSourceMapFile(sourceName: string, sourceContent?: string): string {
        const source = sourceContent ?? `function ${sourceName.replace(/[^a-zA-Z]/g, '')}(){console.log("hello")}`;
        const sourceMap = {
            version: 3,
            file: sourceName,
            sources: [sourceName],
            names: [],
            mappings: 'AAAA',
            sourcesContent: [source],
        };
        const mapPath = path.join(tmpDir, `${sourceName}.map`);
        fs.writeFileSync(mapPath, JSON.stringify(sourceMap));

        // Add sourceMappingURL to source file
        const sourcePath = path.join(tmpDir, sourceName);
        if (fs.existsSync(sourcePath)) {
            const existing = fs.readFileSync(sourcePath, 'utf-8');
            fs.writeFileSync(sourcePath, existing + `\n//# sourceMappingURL=${sourceName}.map`);
        }

        return mapPath;
    }

    function createAsset(name: string): Asset {
        return { name, path: path.join(tmpDir, name) };
    }

    describe('assetErrorBehavior', () => {
        it('should throw and fail the build when behavior is exit and an asset fails', async () => {
            createSourceFile('good.js');
            createSourceMapFile('good.js');
            createSourceFile('bad.js'); // No sourcemap for this one

            const assetError = jest.fn();
            const afterUpload = jest.fn();
            const afterAll = jest.fn();

            const options: BacktracePluginOptions = {
                uploadUrl: 'https://submit.backtrace.io/test/token/sourcemap',
                assetErrorBehavior: 'exit',
            };

            const callbacks: ProcessAndUploadAssetsCommandOptions = {
                assetError,
                afterUpload,
                afterAll,
            };

            const command = processAndUploadAssetsCommand(options, callbacks);

            await expect(command([createAsset('good.js'), createAsset('bad.js')])).rejects.toThrow(
                /1 of 2 asset\(s\) failed to process, 1 succeeded.*Upload aborted/,
            );

            // assetError callback should have been called for the bad asset
            expect(assetError).toHaveBeenCalled();
            // Upload should NOT have happened
            expect(afterUpload).not.toHaveBeenCalled();
            // afterAll should have been called before throwing
            expect(afterAll).toHaveBeenCalled();
        });

        it('should throw by default (no assetErrorBehavior set) when an asset fails', async () => {
            createSourceFile('good.js');
            createSourceMapFile('good.js');
            createSourceFile('bad.js'); // No sourcemap

            const options: BacktracePluginOptions = {
                uploadUrl: 'https://submit.backtrace.io/test/token/sourcemap',
                // assetErrorBehavior not set — defaults to 'exit'
            };

            const command = processAndUploadAssetsCommand(options);

            await expect(command([createAsset('good.js'), createAsset('bad.js')])).rejects.toThrow(
                /asset\(s\) failed to process.*Upload aborted/,
            );
        });

        it('should use assetSkipped (not assetError) and upload successes when behavior is skip', async () => {
            createSourceFile('good.js');
            createSourceMapFile('good.js');
            createSourceFile('bad.js'); // No sourcemap for this one

            const assetError = jest.fn();
            const assetSkipped = jest.fn();
            const assetFinished = jest.fn();

            const options: BacktracePluginOptions = {
                uploadUrl: 'https://submit.backtrace.io/test/token/sourcemap',
                assetErrorBehavior: 'skip',
            };

            const callbacks: ProcessAndUploadAssetsCommandOptions = {
                assetError,
                assetSkipped,
                assetFinished,
            };

            const command = processAndUploadAssetsCommand(options, callbacks);
            const result = await command([createAsset('good.js'), createAsset('bad.js')]);

            // skip should NOT call assetError — it's silent
            expect(assetError).not.toHaveBeenCalled();
            // skip should call assetSkipped instead
            expect(assetSkipped).toHaveBeenCalledTimes(1);
            // The good asset should have been processed successfully
            expect(assetFinished).toHaveBeenCalledTimes(1);
            // Upload should have been attempted (uploadResult should be defined)
            expect(result.uploadResult).toBeDefined();
        });

        it('should use assetError (not assetSkipped) and upload successes when behavior is warn', async () => {
            createSourceFile('good.js');
            createSourceMapFile('good.js');
            createSourceFile('bad.js'); // No sourcemap

            const assetError = jest.fn();
            const assetSkipped = jest.fn();
            const assetFinished = jest.fn();

            const options: BacktracePluginOptions = {
                uploadUrl: 'https://submit.backtrace.io/test/token/sourcemap',
                assetErrorBehavior: 'warn',
            };

            const callbacks: ProcessAndUploadAssetsCommandOptions = {
                assetError,
                assetSkipped,
                assetFinished,
            };

            const command = processAndUploadAssetsCommand(options, callbacks);
            const result = await command([createAsset('good.js'), createAsset('bad.js')]);

            // warn should call assetError (visible warning)
            expect(assetError).toHaveBeenCalledTimes(1);
            // warn should NOT call assetSkipped
            expect(assetSkipped).not.toHaveBeenCalled();
            expect(assetFinished).toHaveBeenCalledTimes(1);
            expect(result.uploadResult).toBeDefined();
        });

        it('should not attempt upload when all assets fail with behavior skip', async () => {
            createSourceFile('bad1.js'); // No sourcemap
            createSourceFile('bad2.js'); // No sourcemap

            const assetError = jest.fn();
            const assetSkipped = jest.fn();
            const afterUpload = jest.fn();

            const options: BacktracePluginOptions = {
                uploadUrl: 'https://submit.backtrace.io/test/token/sourcemap',
                assetErrorBehavior: 'skip',
            };

            const callbacks: ProcessAndUploadAssetsCommandOptions = {
                assetError,
                assetSkipped,
                afterUpload,
            };

            const command = processAndUploadAssetsCommand(options, callbacks);
            const result = await command([createAsset('bad1.js'), createAsset('bad2.js')]);

            // skip mode: assetSkipped called, not assetError
            expect(assetError).not.toHaveBeenCalled();
            expect(assetSkipped).toHaveBeenCalledTimes(2);
            expect(afterUpload).not.toHaveBeenCalled();
            expect(result.uploadResult).toBeUndefined();
        });

        it('should process all assets successfully when none fail', async () => {
            createSourceFile('a.js');
            createSourceMapFile('a.js');
            createSourceFile('b.js');
            createSourceMapFile('b.js');

            const assetError = jest.fn();
            const assetFinished = jest.fn();

            const options: BacktracePluginOptions = {
                uploadUrl: 'https://submit.backtrace.io/test/token/sourcemap',
                assetErrorBehavior: 'skip',
            };

            const callbacks: ProcessAndUploadAssetsCommandOptions = {
                assetError,
                assetFinished,
            };

            const command = processAndUploadAssetsCommand(options, callbacks);
            const result = await command([createAsset('a.js'), createAsset('b.js')]);

            expect(assetError).not.toHaveBeenCalled();
            expect(assetFinished).toHaveBeenCalledTimes(2);
            expect(result.uploadResult).toBeDefined();
        });

        it('should still process without upload when uploadUrl is not set', async () => {
            createSourceFile('good.js');
            createSourceMapFile('good.js');
            createSourceFile('bad.js');

            const assetError = jest.fn();
            const assetSkipped = jest.fn();
            const assetFinished = jest.fn();

            const options: BacktracePluginOptions = {
                assetErrorBehavior: 'skip',
            };

            const callbacks: ProcessAndUploadAssetsCommandOptions = {
                assetError,
                assetSkipped,
                assetFinished,
            };

            const command = processAndUploadAssetsCommand(options, callbacks);
            const result = await command([createAsset('good.js'), createAsset('bad.js')]);

            expect(assetError).not.toHaveBeenCalled();
            expect(assetSkipped).toHaveBeenCalledTimes(1);
            expect(assetFinished).toHaveBeenCalledTimes(1);
            expect(result.uploadResult).toBeUndefined();
        });
    });
});
