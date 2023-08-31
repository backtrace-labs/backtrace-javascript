import { FileFinder, Ok, ResultPromise } from '@backtrace-labs/sourcemap-tools';
import fs from 'fs';
import { glob } from 'glob';
import path from 'path';

export interface FindResult {
    readonly path: string;
    readonly findPath: string;

    /**
     * Whether the file was found with recursive search, or was specified directly via glob.
     */
    readonly direct: boolean;
}

/**
 * Returns files found in directories matching `regex`. If path is a file, it is returned if it matches `regex`.
 * @param regex Regular expression pattern to match.
 * @param paths Paths to search in.
 * @returns Result with file paths.
 */
export async function find(...paths: string[]): ResultPromise<FindResult[], string> {
    const finder = new FileFinder();
    const results = new Map<string, FindResult>();

    for (const globPath of paths) {
        const globResults = await glob(globPath);
        for (const findPath of globResults) {
            const stat = await fs.promises.stat(findPath);
            if (!stat.isDirectory()) {
                const fullPath = path.resolve(findPath);
                if (!results.has(fullPath)) {
                    results.set(fullPath, {
                        path: fullPath,
                        findPath,
                        direct: true,
                    });
                }
                continue;
            }

            const findResult = await finder.find(findPath, { recursive: true });
            if (findResult.isErr()) {
                return findResult;
            }

            for (const result of findResult.data) {
                const fullPath = path.resolve(result);
                if (!results.has(fullPath)) {
                    results.set(fullPath, {
                        path: fullPath,
                        findPath,
                        direct: false,
                    });
                }
            }
        }
    }

    return Ok([...results.values()]);
}
