import path from 'path';
import { createE2ETest } from '../createE2ETest';
import { getBaseConfig } from '../helpers';

describe('Typescript sourcemaps', () => {
    const outputDir = path.join(__dirname, './output');

    createE2ETest((mode) =>
        getBaseConfig(
            {
                mode,
                devtool: 'source-map',
                entry: path.join(__dirname, './input/index.ts'),
                output: {
                    path: outputDir,
                    filename: '[name].js',
                },
            },
            { tsconfigPath: path.join(__dirname, './tsconfig.test.json') },
        ),
    );
});
