import fs from 'fs';
import path from 'path';
import {
    asyncWebpack,
    expectSourceComment,
    expectSourceMapSnippet,
    expectSourceSnippet,
    expectSuccess,
    getBaseConfig,
    getFiles,
    removeDir,
    webpackModeTest,
} from '../helpers';

describe('Single-input-single-output', () => {
    const outputDir = path.join(__dirname, './output');

    beforeEach(async () => {
        await removeDir(outputDir);
    });

    webpackModeTest((mode) => {
        it('should inject function into emitted source files', async () => {
            const config = getBaseConfig(
                {
                    mode,
                    entry: path.join(__dirname, './input/index.ts'),
                    output: {
                        path: outputDir,
                        filename: '[name].js',
                    },
                },
                { tsconfigPath: path.join(__dirname, './tsconfig.test.json') },
            );

            const result = await asyncWebpack(config);
            expectSuccess(result);

            const jsFiles = await getFiles(outputDir, /.js$/);
            expect(jsFiles.length).toBeGreaterThan(0);

            for (const file of jsFiles) {
                const content = await fs.promises.readFile(file, 'utf8');
                await expectSourceSnippet(content);
            }
        }, 30000);

        it('should inject debug ID comment into emitted source files', async () => {
            const config = getBaseConfig(
                {
                    mode,
                    entry: path.join(__dirname, './input/index.ts'),
                    output: {
                        path: outputDir,
                        filename: '[name].js',
                    },
                },
                { tsconfigPath: path.join(__dirname, './tsconfig.test.json') },
            );

            const result = await asyncWebpack(config);
            expectSuccess(result);

            const jsFiles = await getFiles(outputDir, /.js$/);
            expect(jsFiles.length).toBeGreaterThan(0);

            for (const file of jsFiles) {
                const content = await fs.promises.readFile(file, 'utf8');
                await expectSourceComment(content);
            }
        });

        it('should inject debug ID into emitted sourcemap files', async () => {
            const config = getBaseConfig(
                {
                    mode,
                    entry: path.join(__dirname, './input/index.ts'),
                    devtool: 'source-map',
                    output: {
                        path: outputDir,
                        filename: '[name].js',
                    },
                },
                { tsconfigPath: path.join(__dirname, './tsconfig.test.json') },
            );

            const result = await asyncWebpack(config);
            expectSuccess(result);

            const mapFiles = await getFiles(outputDir, /.js.map$/);
            expect(mapFiles.length).toBeGreaterThan(0);

            for (const file of mapFiles) {
                const content = await fs.promises.readFile(file, 'utf8');
                await expectSourceMapSnippet(content);
            }
        }, 30000);
    });
});
