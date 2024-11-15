import type { ChunkSink } from './Chunkifier';
import type { FileSystem } from './FileSystem';
import type { FileWritableStream } from './StreamWriter';

interface FileChunkSinkOptions {
    /**
     * Maximum number of files.
     */
    readonly maxFiles: number;

    /**
     * Full path to the chunk file.
     */
    readonly file: (n: number) => string;

    /**
     * File system to use.
     */
    readonly fs: FileSystem;
}

/**
 * Chunk sink which writes data to disk.
 *
 * Each time a new chunk is created, a new stream is created with path provided from options.
 */
export class FileChunkSink {
    private readonly _streamTracker: LimitedFifo<FileWritableStream>;

    /**
     * Returns all files that have been written to and are not deleted.
     */
    public get files() {
        return this._streamTracker.elements;
    }

    constructor(private readonly _options: FileChunkSinkOptions) {
        // Track files using a FIFO queue
        this._streamTracker = limitedFifo<FileWritableStream>(_options.maxFiles, async (stream) => {
            await stream
                .close()
                .catch(() => {
                    // Fail silently here, there's not much we can do about this
                })
                .finally(() =>
                    _options.fs.unlink(stream.path).catch(() => {
                        // Fail silently here, there's not much we can do about this
                    }),
                );
        });
    }

    /**
     * Returns `ChunkSink`. Pass this to `chunkifier`.
     */
    public getSink(): ChunkSink<string, FileWritableStream> {
        return (n) => {
            const stream = this.createStream(n);
            this._streamTracker.push(stream);
            return stream;
        };
    }

    private createStream(n: number) {
        const path = this._options.file(n);
        return this._options.fs.createWriteStream(path);
    }
}

/**
 * Limited FIFO queue. Each time the capacity is exceeded, the first element is removed
 * and `onShift` is called with the removed element.
 * @param capacity Maximum capacity.
 */
function limitedFifo<T>(capacity: number, onShift: (t: T) => void) {
    const elements: T[] = [];

    function push(element: T) {
        elements.push(element);
        if (elements.length > capacity) {
            const first = elements.shift();
            if (first) {
                onShift(first);
            }
        }
    }

    return { elements: elements as readonly T[], push };
}

type LimitedFifo<T> = ReturnType<typeof limitedFifo<T>>;
