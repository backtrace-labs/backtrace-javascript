import { FileFinder, log, pipe } from '@backtrace-labs/sourcemap-tools';
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
export async function find(paths: string[]): Promise<FindResult[]> {
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

            const findResults = await finder.find(findPath, { recursive: true });
            for (const result of findResults) {
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

    return [...results.values()];
}

export function includesFindResult(includes: FindResult[]) {
    const pathSet = new Set(includes.map((i) => i.path));
    return function _includesFindResult(result: FindResult) {
        return pathSet.has(result.path);
    };
}

export async function buildIncludeExclude(
    includePaths: string[] | undefined,
    excludePaths: string[] | undefined,
    logger: ReturnType<typeof log>,
) {
    const resolvedIncludePaths = includePaths ? await find(includePaths) : undefined;
    const isIncluded = resolvedIncludePaths
        ? (result: FindResult) =>
              pipe(
                  result,
                  includesFindResult(resolvedIncludePaths),
                  logger((t) => (t ? `result included: ${result.path}` : `result not included: ${result.path}`)),
              )
        : undefined;

    const resolvedExcludePaths = excludePaths ? await find(excludePaths) : undefined;
    const isExcluded = resolvedExcludePaths
        ? (result: FindResult) =>
              pipe(
                  result,
                  includesFindResult(resolvedExcludePaths),
                  logger((t) => (t ? `result excluded: ${result.path}` : `result not excluded: ${result.path}`)),
              )
        : undefined;

    return { isIncluded, isExcluded } as const;
}
