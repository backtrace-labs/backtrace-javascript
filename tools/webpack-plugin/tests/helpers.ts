import fs from 'fs';
import path from 'path';
import webpack from 'webpack';
import { BacktracePlugin } from '../src';

/**
 * Returns a config with base configuration.
 *
 * Input and output should be provided in the arguments.
 */
export function getBaseConfig(config: webpack.Configuration, tsconfigPath?: string): webpack.Configuration {
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
                        configFile: tsconfigPath,
                    },
                },
            ],
        },
        plugins: [new BacktracePlugin()],
        ...config,
    };
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

export function expectSuccess(stats?: webpack.Stats) {
    expect(stats).toBeDefined();
    if (stats?.hasErrors()) {
        throw new Error(stats.toString());
    }
}

export async function expectSourceSnippet(content: string) {
    expect(content).toContain('console.log("Injected');
}

export async function expectSourceComment(content: string) {
    expect(content).toMatch(/^\/\/# x-backtrace-debugId=[a-fA-F0-9-]+$/m);
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
