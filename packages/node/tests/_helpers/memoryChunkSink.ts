import { Writable } from 'stream';
import { ChunkSink } from '../../src/streams/chunkifier.js';

export function memoryChunkSink() {
    const results: Buffer[][] = [];

    const sink: ChunkSink = () => {
        const index = results.length;
        results.push([]);

        return new Writable({
            write(chunk, encoding, callback) {
                results[index].push(chunk);
                callback();
            },
        });
    };

    const getResults = () => {
        return results.map((chunks) => Buffer.concat(chunks));
    };

    return { sink, getResults };
}
