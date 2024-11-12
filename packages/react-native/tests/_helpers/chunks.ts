import { Chunk, ChunkSplitter } from '../../src/storage/Chunkifier';

/**
 * Trims array from right until `predicate` returns `false`.
 * @returns Trimmed array.
 */
function trimRightIf<T>(t: T[], predicate: (t: T) => boolean) {
    for (let i = t.length - 1; i >= 0; i--) {
        if (predicate(t[i])) {
            continue;
        }

        return t.slice(0, i + 1);
    }

    return [];
}

export async function splitToEnd<W extends Chunk>(readable: ReadableStream, splitter: ChunkSplitter<W>) {
    const results: W[][] = [[]];

    for await (let chunk of readable) {
        while (chunk) {
            const [c1, c2] = splitter(chunk);
            results[results.length - 1].push(c1);
            if (c2 !== undefined) {
                chunk = c2;
                results.push([]);
            } else {
                break;
            }
        }
    }

    // Remove all trailing empty arrays
    return trimRightIf(
        results.map((b) => b.join('')),
        (t) => !t.length,
    );
}

export function* chunkify(chunk: string, length: number) {
    let i = 0;
    do {
        yield chunk.substring(i * length, (i + 1) * length);
        i++;
    } while (i * length < chunk.length);
}
