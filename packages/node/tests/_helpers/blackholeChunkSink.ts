import { Writable } from 'stream';
import { ChunkSink } from '../../src/streams/chunkifier';

export function blackholeChunkSink(): ChunkSink {
    return () => {
        return new Writable({
            write(chunk, encoding, callback) {
                callback();
            },
        });
    };
}
