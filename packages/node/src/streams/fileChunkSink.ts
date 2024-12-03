import EventEmitter from 'events';
import fs from 'fs';
import { NodeFileSystem } from '../storage/interfaces/NodeFileSystem.js';
import { ChunkSink } from './chunkifier.js';

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
     * File system implementation to use.
     */
    readonly fs: NodeFileSystem;
}

/**
 * Chunk sink which writes data to disk.
 *
 * Each time a new chunk is created, a new stream is created with path provided from options.
 */
export class FileChunkSink extends EventEmitter {
    private readonly _streamTracker: LimitedFifo<fs.WriteStream>;

    /**
     * Returns all files that have been written to and are not deleted.
     */
    public get files() {
        return this._streamTracker.elements;
    }

    constructor(private readonly _options: FileChunkSinkOptions) {
        super();

        // Track files using a FIFO queue
        this._streamTracker = limitedFifo<fs.WriteStream>(_options.maxFiles, (file) => {
            // On file removal, emit delete or delete the file
            // If file is not yet destroyed (pending writes), wait on 'close'
            if (file.destroyed) {
                this.emitDeleteOrDelete(file);
            } else {
                file.once('close', () => this.emitDeleteOrDelete(file));
            }
        });
    }

    /**
     * Returns `ChunkSink`. Pass this to `chunkifier`.
     */
    public getSink(): ChunkSink<fs.WriteStream> {
        return (n) => {
            const stream = this.createStream(n);
            this._streamTracker.push(stream);
            this.emit('create', stream);
            return stream;
        };
    }

    private createStream(n: number) {
        const path = this._options.file(n);
        return (this._options.fs ?? fs).createWriteStream(path);
    }

    private emitDeleteOrDelete(file: fs.WriteStream) {
        // If 'delete' event is not handled, delete the file
        if (!this.emit('delete', file)) {
            this._options.fs.unlink(file.path.toString('utf-8')).catch(() => {
                // Do nothing on error
            });
        }
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
