import { Readable, Writable } from 'stream';
import { chunkifier, ChunkSplitter } from '../../src/streams/chunkifier.js';
import { blackholeChunkSink } from '../_helpers/blackholeChunkSink.js';
import { splitToEnd } from '../_helpers/chunks.js';
import { limit, randomString } from '../_helpers/generators.js';
import { memoryChunkSink } from '../_helpers/memoryChunkSink.js';

function charSplitter(char: string): ChunkSplitter {
    return (chunk) => {
        const index = chunk.indexOf(char);
        if (index === -1) {
            return [chunk];
        }
        return [chunk.subarray(0, index), chunk.subarray(index + 1)];
    };
}

function noopSplitter(): ChunkSplitter {
    return (c: Buffer) => [c];
}

describe('chunkifier', () => {
    it('should call splitter function with every chunk', (done) => {
        const data = randomString().pipe(limit(16384 * 10));
        const splitter = jest.fn(noopSplitter());

        const instance = chunkifier({
            sink: blackholeChunkSink(),
            splitter: () => splitter,
        });

        instance.on('finish', () => {
            expect(splitter).toHaveBeenCalledTimes(10);
            done();
        });

        data.pipe(instance);
    });

    it('should call splitter factory with every new chunk', (done) => {
        const data = randomString().pipe(limit(500));

        const splitCount = 10;
        let split = 0;
        const splitterFactory = jest.fn(
            (): ChunkSplitter => (chunk) => {
                if (split < splitCount) {
                    split++;
                    return [chunk.subarray(0, 10), chunk.subarray(10)];
                }
                return [chunk];
            },
        );

        const instance = chunkifier({
            sink: blackholeChunkSink(),
            splitter: splitterFactory,
        });

        instance.on('finish', () => {
            expect(splitterFactory).toHaveBeenCalledTimes(splitCount + 1);
            done();
        });

        data.pipe(instance);
    });

    it('should not call sink on chunkifier creation', () => {
        const splitter = noopSplitter();
        const sink = jest.fn(blackholeChunkSink());

        chunkifier({
            sink,
            splitter: () => splitter,
        });

        expect(sink).not.toHaveBeenCalled();
    });

    it('should call sink on chunk split', (done) => {
        const data = Readable.from('bAb');
        const splitter = charSplitter('A');
        const sink = jest.fn(blackholeChunkSink());

        const instance = chunkifier({
            sink,
            splitter: () => splitter,
        });

        data.pipe(instance).on('finish', () => {
            expect(sink).toHaveBeenCalledTimes(2);
            done();
        });
    });

    it('should forward drain event from sink stream', (done) => {
        const stream = new Writable({
            write(chunk, encoding, callback) {
                callback();
            },
        });

        const instance = chunkifier({
            sink: () => stream,
            splitter: noopSplitter,
        });

        instance.on('drain', () => {
            done();
        });

        // make sure to write something to ensure that the sink has been used
        Readable.from('a')
            .pipe(instance)
            .on('finish', () => {
                stream.emit('drain');
            });
    });

    it('should split data into chunks', async () => {
        const dataStr = randomString().read(5000);
        const data = Readable.from(dataStr);
        const splitter = charSplitter(dataStr[3]);
        const { sink, getResults } = memoryChunkSink();

        const expected = await splitToEnd(Readable.from(dataStr), splitter);

        const instance = chunkifier({
            sink,
            splitter: () => splitter,
            allowEmptyChunks: true,
        });

        await new Promise<void>((resolve, reject) => {
            data.pipe(instance)
                .on('finish', () => {
                    try {
                        const results = getResults();
                        expect(results).toEqual(expected);
                    } catch (err) {
                        reject(err);
                    }
                    resolve();
                })
                .on('error', reject);
        });
    });

    it('should split data into non-empty chunks', async () => {
        const dataStr = randomString().read(5000);
        const data = Readable.from(dataStr);
        const splitter = charSplitter(dataStr[3]);
        const { sink, getResults } = memoryChunkSink();

        const expected = (await splitToEnd(Readable.from(dataStr), splitter)).filter((b) => b.length);

        const instance = chunkifier({
            sink,
            splitter: () => splitter,
            allowEmptyChunks: false,
        });

        await new Promise<void>((resolve, reject) => {
            data.pipe(instance)
                .on('finish', () => {
                    try {
                        const results = getResults();
                        expect(results).toEqual(expected);
                    } catch (err) {
                        reject(err);
                    }
                    resolve();
                })
                .on('error', reject);
        });
    });

    it('should create empty chunks if allowEmptyChunks is true', async () => {
        const testData = 'abcaaaabcdaaa';
        const splitter = charSplitter('a');
        const expected = ['', 'bc', '', '', '', 'bcd', '', ''];
        const { sink, getResults } = memoryChunkSink();

        const instance = chunkifier({
            sink,
            splitter: () => splitter,
            allowEmptyChunks: true,
        });

        await new Promise<void>((resolve, reject) => {
            Readable.from(testData)
                .pipe(instance)
                .on('finish', () => {
                    try {
                        const results = getResults().map((b) => b.toString('utf-8'));
                        expect(results).toEqual(expected);
                    } catch (err) {
                        reject(err);
                    }
                    resolve();
                })
                .on('error', reject);
        });
    });

    it('should not create empty chunks if allowEmptyChunks is false', async () => {
        const testData = 'abcaaaabcdaaa';
        const splitter = charSplitter('a');
        const expected = ['bc', 'bcd'];
        const { sink, getResults } = memoryChunkSink();

        const instance = chunkifier({
            sink,
            splitter: () => splitter,
            allowEmptyChunks: false,
        });

        await new Promise<void>((resolve, reject) => {
            Readable.from(testData)
                .pipe(instance)
                .on('finish', () => {
                    try {
                        const results = getResults().map((b) => b.toString('utf-8'));
                        expect(results).toEqual(expected);
                    } catch (err) {
                        reject(err);
                    }
                    resolve();
                })
                .on('error', reject);
        });
    });
});
