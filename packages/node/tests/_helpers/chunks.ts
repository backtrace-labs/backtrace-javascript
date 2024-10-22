import { Readable } from 'stream';
import { ChunkSplitter } from '../../src/streams/chunkifier.js';

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

export async function splitToEnd(readable: Readable, splitter: ChunkSplitter) {
    const results: Buffer[][] = [[]];

    for await (let chunk of readable) {
        while (chunk) {
            const [c1, c2] = splitter(chunk, readable.readableEncoding ?? 'utf-8');
            results[results.length - 1].push(c1);
            if (c2) {
                chunk = c2;
                results.push([]);
            } else {
                break;
            }
        }
    }

    // Remove all trailing empty arrays
    return trimRightIf(
        results.map((b) => Buffer.concat(b)),
        (t) => !t.length,
    );
}

export function* chunkify(chunk: Buffer, length: number) {
    let i = 0;
    do {
        yield chunk.subarray(i * length, (i + 1) * length);
        i++;
    } while (i * length < chunk.length);
}
