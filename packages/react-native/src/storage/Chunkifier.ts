export type ChunkSplitterFactory = () => ChunkSplitter;

/**
 * Implementation of splitter should return either one or two `Buffer`s.
 *
 * The first `Buffer` will be written to the current chunk.
 * If the second `Buffer` is returned, `chunkifier` will create a new chunk and write the
 * second buffer to the new chunk.
 */
export type ChunkSplitter = (chunk: string) => [string, string?];

/**
 * Implementation of chunk sink should return each time a new writable stream.
 *
 * `n` determines which stream it is in sequence.
 */
export type ChunkSink<S extends WritableStream = WritableStream> = (n: number) => S;

export interface ChunkifierOptions {
    /**
     * Chunk splitter factory. The factory will be called when creating a new chunk.
     */
    readonly splitter: ChunkSplitterFactory;

    /**
     * Chunk sink. The sink will be called when creating a new chunk.
     */
    readonly sink: ChunkSink;

    readonly allowEmptyChunks?: boolean;
}

interface StreamContext {
    readonly stream: WritableStream;
    readonly streamWriter: WritableStreamDefaultWriter;
    isEmptyChunk: boolean;
}

export class ChunkifierSink implements UnderlyingSink<string> {
    private _context?: StreamContext;
    private _splitter?: ChunkSplitter;
    private _chunkCount = 0;

    constructor(private readonly _options: ChunkifierOptions) {}

    public async write(data: string): Promise<void> {
        // If data is empty from the start, forward the write directly to current stream
        if (!data.length) {
            return await (this._context ??= this.createStreamContext()).streamWriter.write(data);
        }

        while (data) {
            if (!data.length) {
                break;
            }

            this._splitter ??= this._options.splitter();
            const [currentChunk, nextChunk] = this._splitter(data);
            if (nextChunk === undefined) {
                const current = (this._context ??= this.createStreamContext());
                if (currentChunk.length) {
                    current.isEmptyChunk = false;
                }

                return await current.streamWriter.write(currentChunk);
            }

            data = nextChunk;
            if (this._context ? this._context.isEmptyChunk : !currentChunk.length && !this._options.allowEmptyChunks) {
                continue;
            }

            const current = (this._context ??= this.createStreamContext());
            await current.streamWriter.write(currentChunk);
            current.streamWriter.releaseLock();

            // On next loop iteration, or write, create new stream again
            this._context = undefined;
            this._splitter = undefined;
        }
    }

    public async close() {
        return await this._context?.streamWriter.close();
    }

    private createStreamContext(): StreamContext {
        const stream = this._options.sink(this._chunkCount++);
        const writer = stream.getWriter();
        return { stream, streamWriter: writer, isEmptyChunk: true };
    }
}
