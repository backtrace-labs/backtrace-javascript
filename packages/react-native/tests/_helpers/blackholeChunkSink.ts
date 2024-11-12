import { ChunkSink } from '../../src/storage/Chunkifier';

export function blackholeChunkSink(): ChunkSink {
    return () => {
        return new WritableStream({
            write() {
                // Do nothing
            },
        });
    };
}
