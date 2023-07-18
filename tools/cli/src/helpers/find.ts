import { Err, FileFinder, Ok, ResultPromise } from '@backtrace/sourcemap-tools';
import fs from 'fs';
import path from 'path';

/**
 * Returns files found in directories matching `regex`. If path is a file, it is returned if it matches `regex`.
 * @param regex Regular expression pattern to match.
 * @param paths Paths to search in.
 * @returns Result with file paths.
 */
export async function find(regex: RegExp, ...paths: string[]): ResultPromise<string[], string> {
    const finder = new FileFinder();
    const results = new Map<string, string>();
    for (const findPath of paths) {
        const stat = await fs.promises.stat(findPath);
        if (!stat.isDirectory()) {
            if (!findPath.match(regex)) {
                return Err(`${findPath} does not match regex: ${regex}`);
            }
            const fullPath = path.resolve(findPath);
            if (!results.has(fullPath)) {
                results.set(fullPath, findPath);
            }
            continue;
        }

        const findResult = await finder.find(findPath, { match: regex, recursive: true });
        if (findResult.isErr()) {
            return findResult;
        }

        for (const result of findResult.data) {
            const fullPath = path.resolve(result);
            if (!results.has(fullPath)) {
                results.set(fullPath, result);
            }
        }
    }

    return Ok([...results.values()]);
}
