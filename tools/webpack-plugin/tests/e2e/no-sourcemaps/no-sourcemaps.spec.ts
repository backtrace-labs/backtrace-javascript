import { SourceProcessor } from '@backtrace-labs/sourcemap-tools';
import path from 'path';
import { asyncWebpack, expectSuccess, getBaseConfig, removeDir, webpackModeTest } from '../helpers';

describe('No sourcemaps', () => {
    const outputDir = path.join(__dirname, './output');

    webpackModeTest((mode) => {
        it('should not call SourceProcessor when devtool is false', async () => {
            const config = getBaseConfig(
                {
                    mode,
                    devtool: false,
                    entry: path.join(__dirname, './input/index.ts'),
                    output: {
                        path: outputDir,
                        filename: '[name].js',
                    },
                },
                { tsconfigPath: path.join(__dirname, './tsconfig.test.json') },
            );

            if (config.output?.path) {
                await removeDir(config.output.path);
            }

            const sourceProcessorSpy = jest.spyOn(SourceProcessor.prototype, 'processSourceAndSourceMap');

            const webpackResult = await asyncWebpack(config);
            expectSuccess(webpackResult);

            expect(sourceProcessorSpy).not.toBeCalled();
        }, 120000);
    });
});
