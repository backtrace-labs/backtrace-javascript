import { EventEmitter, Writable, WritableOptions } from 'stream';

export type ChunkSplitterFactory = () => (chunk: Buffer, encoding: BufferEncoding) => [Buffer, Buffer?];

/**
 * Implementation of splitter should return either one or two `Buffer`s.
 *
 * The first `Buffer` will be written to the current chunk.
 * If the second `Buffer` is returned, `chunkifier` will create a new chunk and write the
 * second buffer to the new chunk.
 */
export type ChunkSplitter = (chunk: Buffer, encoding: BufferEncoding) => [Buffer, Buffer?];

/**
 * Implementation of chunk sink should return each time a new writable stream.
 *
 * `n` determines which stream it is in sequence.
 */
export type ChunkSink<S extends Writable = Writable> = (n: number) => S;

export interface ChunkifierOptions extends WritableOptions {
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
    readonly stream: Writable;
    readonly disposeEvents: () => void;
    isEmptyChunk: boolean;
}

/**
 * Splits incoming data into chunks, writing them to the sink.
 */
export function chunkifier({ sink: streamFactory, ...options }: ChunkifierOptions) {
    let chunkCount = 0;

    function createStreamContext(): StreamContext {
        const stream = streamFactory(chunkCount++);

        // We need to forward the 'drain' event, in case the sink stream resumes writing.
        const disposeEvents = forwardEvents(stream, writable, 'drain');

        return { stream, disposeEvents, isEmptyChunk: true };
    }

    let context: StreamContext | undefined;
    let splitter: ChunkSplitter | undefined;

    const writable = new Writable({
        ...options,
        write(data: Buffer, encoding, callback) {
            // If data is empty from the start, forward the write directly to current stream
            if (!data.length) {
                return (context ??= createStreamContext()).stream.write(data, encoding, callback);
            }

            while (data) {
                if (!data.length) {
                    break;
                }

                splitter ??= options.splitter();
                const [currentChunk, nextChunk] = splitter(data, encoding);
                if (!nextChunk) {
                    const current = (context ??= createStreamContext());
                    if (currentChunk.length) {
                        current.isEmptyChunk = false;
                    }

                    return current.stream.write(currentChunk, encoding, callback);
                }

                data = nextChunk;
                if (context ? context.isEmptyChunk : !currentChunk.length && !options.allowEmptyChunks) {
                    continue;
                }

                const current = (context ??= createStreamContext());
                current.disposeEvents();
                current.stream.write(currentChunk, encoding, (err) => {
                    current.stream.destroy(err ?? undefined);
                });

                // On next loop iteration, or write, create new stream again
                context = undefined;
                splitter = undefined;
            }
            callback();
            return true;
        },
    });
    return writable;
}

function forwardEvents<E extends EventEmitter>(from: E, to: E, ...events: string[]) {
    const fwd =
        (event: string) =>
        (...args: any[]) =>
            to.emit(event as string, ...args, to);

    const forwards: [string, ReturnType<typeof fwd>][] = [];
    for (const event of events) {
        const fn = fwd(event);
        from.on(event, fn);
        forwards.push([event, fn]);
    }

    // Return a dispose function - when called, event callbacks will be detached
    const off = () => forwards.forEach(([event, fn]) => from.off(event, fn));
    return off;
}
