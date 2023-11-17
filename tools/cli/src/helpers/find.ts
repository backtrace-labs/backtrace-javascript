import {
    Err,
    FileFinder,
    Ok,
    R,
    Result,
    filter,
    flatMap,
    flow,
    log,
    map,
    mapAsync,
    pipe,
    statFile,
} from '@backtrace/sourcemap-tools';
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

export interface FindFileTuple {
    readonly file1: FindResult;
    readonly file2?: string;
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

export async function findTuples(paths: string[]): Promise<Result<FindFileTuple[], string>> {
    function findLongest(char: string, str: string) {
        return pipe(
            [...str.matchAll(new RegExp(`${char}+`, 'g'))],
            flatMap((a) => a),
            (a) => a.sort((a, b) => b.length - a.length),
            (a) => a[0],
        );
    }

    function splitByLongest(char: string) {
        return async function _splitByLongest(str: string) {
            const longest = await findLongest(char, str);
            if (!longest) {
                return [str];
            }
            return str.split(longest);
        };
    }

    return pipe(
        paths,
        mapAsync(splitByLongest(':')),
        mapAsync(([path1, path2]) =>
            path2
                ? pipe(
                      [path1, path2],
                      mapAsync(statFile),
                      R.flatMap,
                      R.map(
                          flow(
                              map((r) =>
                                  r.isFile()
                                      ? Ok(path2)
                                      : Err(`${path1}:${path2}: both paths of tuple must point to files`),
                              ),
                              R.flatMap,
                          ),
                      ),
                      R.map(() => [path1, path2]),
                  )
                : Ok([path1, path2]),
        ),
        R.flatMap,
        R.map(mapAsync(async ([path1, path2]) => ({ result: await find([path1]), path2 }))),
        R.map(filter(({ result }) => result.length > 0)),
        R.map(flatMap(({ result, path2 }) => result.map((file1) => ({ file1, file2: path2 })))),
    );
}

export const file2Or1FromTuple = ({ file1, file2 }: FindFileTuple) =>
    file2 ? ({ direct: true, findPath: file2, path: file2 } as FindResult) : file1;
