import { Readable } from 'stream';
import { ChunkSplitter } from '../../src/streams/chunkifier.js';

export async function splitToEnd(readable: Readable, splitter: ChunkSplitter) {
    const results: Buffer[][] = [[]];

    for await (let chunk of readable) {
        while (chunk) {
            const [c1, c2] = splitter(chunk, readable.readableEncoding ?? 'utf-8');
            results[results.length - 1].push(c1);
            if (!c2?.length) {
                break;
            } else if (c2) {
                chunk = c2;
                results.push([]);
            } else {
                break;
            }
        }
    }

    return results.map((b) => Buffer.concat(b));
}

export function* chunkify(chunk: Buffer, length: number) {
    let i = 0;
    do {
        yield chunk.subarray(i * length, (i + 1) * length);
        i++;
    } while (i * length < chunk.length);
}
