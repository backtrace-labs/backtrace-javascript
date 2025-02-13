export type ChunkSplitterFactory<W extends Chunk> = () => ChunkSplitter<W>;

/**
 * Implementation of splitter should return either one or two `Buffer`s.
 *
 * The first `Buffer` will be written to the current chunk.
 * If the second `Buffer` is returned, `chunkifier` will create a new chunk and write the
 * second buffer to the new chunk.
 */
export type ChunkSplitter<W extends Chunk> = (chunk: W) => [W, W?];

/**
 * Implementation of chunk sink should return each time a new writable stream.
 *
 * `n` determines which stream it is in sequence.
 */
export type ChunkSink<W extends Chunk, S extends WritableStream<W> = WritableStream<W>> = (n: number) => S;

export type Chunk = { readonly length: number };

export interface ChunkifierOptions<W extends Chunk> {
    /**
     * Chunk splitter factory. The factory will be called when creating a new chunk.
     */
    readonly splitter: ChunkSplitterFactory<W>;

    /**
     * Chunk sink. The sink will be called when creating a new chunk.
     */
    readonly sink: ChunkSink<W>;

    readonly allowEmptyChunks?: boolean;
}

interface StreamContext<W extends Chunk> {
    readonly stream: WritableStream<W>;
    readonly streamWriter: WritableStreamDefaultWriter<W>;
    isEmptyChunk: boolean;
}

export class ChunkifierSink<W extends Chunk> implements UnderlyingSink<W> {
    private _context?: StreamContext<W>;
    private _splitter?: ChunkSplitter<W>;
    private _chunkCount = 0;

    constructor(private readonly _options: ChunkifierOptions<W>) {}

    public async write(data: W): Promise<void> {
        // If data is empty from the start, forward the write directly to current stream
        if (this.isEmpty(data)) {
            return await this.ensureStreamContext().streamWriter.write(data);
        }

        while (data) {
            if (this.isEmpty(data)) {
                break;
            }

            const splitter = this.ensureSplitter();
            const [currentChunk, nextChunk] = splitter(data);
            if (nextChunk === undefined) {
                const current = this.ensureStreamContext();
                if (!this.isEmpty(currentChunk)) {
                    current.isEmptyChunk = false;
                }

                return await current.streamWriter.write(currentChunk);
            }

            data = nextChunk;
            if (
                this._context
                    ? this._context.isEmptyChunk
                    : this.isEmpty(currentChunk) && !this._options.allowEmptyChunks
            ) {
                continue;
            }

            const current = this.ensureStreamContext();
            await current.streamWriter.write(currentChunk);
            current.streamWriter.releaseLock();

            // On next loop iteration, or write, create new stream again
            this.reset();
        }
    }

    public async close() {
        return await this._context?.streamWriter.close();
    }

    private ensureStreamContext() {
        if (!this._context) {
            return (this._context = this.createStreamContext());
        }
        return this._context;
    }

    private ensureSplitter() {
        if (!this._splitter) {
            return (this._splitter = this._options.splitter());
        }
        return this._splitter;
    }

    private createStreamContext(): StreamContext<W> {
        const stream = this._options.sink(this._chunkCount++);
        const writer = stream.getWriter();
        return { stream, streamWriter: writer, isEmptyChunk: true };
    }

    /**
     * Resets the chunkifier to it's initial state. Use when switching streams.
     */
    private reset() {
        this._context = undefined;

        // Splitter may have an internal state which we need to recreate with new stream
        this._splitter = undefined;
    }

    private isEmpty(chunk: W) {
        return !chunk.length;
    }
}
