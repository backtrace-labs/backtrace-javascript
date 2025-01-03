import fs from 'fs';
import path from 'path';
import webpack from 'webpack';
import { BacktracePlugin, BacktracePluginOptions } from '../../src';

export interface BaseConfigOptions {
    tsconfigPath?: string;
    pluginOptions?: BacktracePluginOptions;
}

/**
 * Returns a config with base configuration.
 *
 * Input and output should be provided in the arguments.
 */
export function getBaseConfig(config: webpack.Configuration, options?: BaseConfigOptions): webpack.Configuration {
    return {
        resolve: {
            extensions: ['.ts', '.js'],
        },
        module: {
            rules: [
                {
                    test: /.ts$/,
                    loader: 'ts-loader',
                    options: {
                        configFile: options?.tsconfigPath,
                    },
                },
            ],
        },
        plugins: [new BacktracePlugin({ uploadUrl: 'https://localhost', ...options?.pluginOptions })],
        ...config,
    };
}

export function webpackModeTest(callback: (testCase: webpack.Configuration['mode']) => void) {
    const cases: webpack.Configuration['mode'][] = [undefined, 'none', 'development', 'production'];

    for (const testCase of cases) {
        describe(`Webpack mode: ${testCase}`, () => callback(testCase));
    }
}

export function asyncWebpack(config: webpack.Configuration): Promise<webpack.Stats | undefined> {
    return new Promise((resolve, reject) => {
        webpack(config, (err, stats) => {
            if (err) {
                reject(err);
            }

            resolve(stats);
        });
    });
}

export function expectSuccess(stats?: webpack.Stats): asserts stats is webpack.Stats {
    expect(stats).toBeDefined();
    if (stats?.hasErrors()) {
        throw new Error(stats.toString());
    }
}

export async function getFiles(dir: string, test?: RegExp) {
    const files = (await fs.promises.readdir(dir)).map((f) => path.join(dir, f));
    if (test) {
        return files.filter((f) => test.test(f));
    }
    return files;
}

export async function removeDir(dir: string) {
    try {
        await fs.promises.rm(dir, { recursive: true, force: true });
    } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
            return;
        }

        throw err;
    }
}
