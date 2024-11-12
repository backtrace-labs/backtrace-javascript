import { ChunkSink } from '../../src/storage/Chunkifier';

export function blackholeChunkSink(): ChunkSink<never> {
    return () => {
        return new WritableStream({
            write() {
                // Do nothing
            },
        });
    };
}
