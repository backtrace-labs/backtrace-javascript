import fs from 'fs';
import path from 'path';
import { asyncWebpack, expectSourceSnippet, expectSuccess, getBaseConfig, getFiles, removeDir } from '../helpers';

describe('Single-input-single-output', () => {
    const outputDir = path.join(__dirname, './output');

    beforeEach(async () => {
        await removeDir(outputDir);
    });

    it('should inject function into emitted source files', async () => {
        const config = getBaseConfig(
            {
                entry: path.join(__dirname, './input/index.ts'),
                output: {
                    path: outputDir,
                    filename: '[name].js',
                },
            },
            path.join(__dirname, './tsconfig.test.json'),
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
});
