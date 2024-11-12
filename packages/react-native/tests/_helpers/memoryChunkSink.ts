import { ChunkSink } from '../../src/storage/Chunkifier';

export function memoryChunkSink() {
    const results: string[][] = [];

    const sink: ChunkSink = () => {
        const index = results.length;
        results.push([]);

        return new WritableStream({
            write(chunk) {
                results[index].push(chunk);
            },
        });
    };

    const getResults = () => {
        return results.map((chunks) => chunks.join(''));
    };

    return { sink, getResults };
}
