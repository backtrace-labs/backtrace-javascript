import { WritableStream } from 'web-streams-polyfill';
import { ChunkSink } from '../../src/storage/Chunkifier';

export function memoryChunkSink() {
    const results: string[][] = [];

    const sink: ChunkSink<string> = () => {
        const index = results.length;
        results.push([]);

        return new WritableStream<string>({
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
