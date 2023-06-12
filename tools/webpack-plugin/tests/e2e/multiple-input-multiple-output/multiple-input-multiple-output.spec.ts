import path from 'path';
import { createE2ETest } from '../createE2ETest';
import { getBaseConfig } from '../helpers';

describe('Multiple-input-multiple-output', () => {
    const outputDir = path.join(__dirname, './output');

    createE2ETest((mode) =>
        getBaseConfig(
            {
                mode,
                devtool: 'source-map',
                entry: {
                    entry1: path.join(__dirname, './input/entry1.ts'),
                    entry2: path.join(__dirname, './input/entry2.ts'),
                },
                output: {
                    path: outputDir,
                    filename: '[name].js',
                },
            },
            { tsconfigPath: path.join(__dirname, './tsconfig.test.json') },
        ),
    );
});
