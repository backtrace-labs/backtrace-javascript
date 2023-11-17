import {
    Err,
    FileFinder,
    Ok,
    R,
    Result,
    ResultPromise,
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

    function verifyTupleLength(path: string) {
        return function _verifyTupleLength(paths: readonly string[]) {
            return paths.length > 2
                ? Err(`${path}: only two paths are allowed in a tuple`)
                : Ok(paths as readonly [string, string?]);
        };
    }

    function verifyTuple(path: string) {
        return async function _verifyTuple([path1, path2]: readonly [string, string?]) {
            return path2
                ? await pipe(
                      [path1, path2],
                      mapAsync(statFile),
                      R.flatMap,
                      R.map(
                          flow(
                              map((r) =>
                                  r.isFile() ? Ok(path2) : Err(`${path}: both paths of tuple must point to files`),
                              ),
                              R.flatMap,
                          ),
                      ),
                      R.map(() => [path1, path2] as const),
                  )
                : Ok([path1, path2] as const);
        };
    }

    function processPath(path: string): ResultPromise<FindFileTuple[], string> {
        return pipe(
            path,
            splitByLongest(':'),
            verifyTupleLength(path),
            R.map(verifyTuple(path)),
            R.map(async ([path1, path2]) => ({ result: await find([path1]), path2 })),
            R.map(({ result, path2 }) => result.map((file1) => ({ file1, file2: path2 }))),
        );
    }

    return pipe(paths, mapAsync(processPath), R.flatMap, R.map(flatMap((x) => x)));
}

export const file2Or1FromTuple = ({ file1, file2 }: FindFileTuple) =>
    file2 ? ({ direct: true, findPath: file2, path: file2 } as FindResult) : file1;
