import { ChunkifierSink, ChunkSplitter } from '../../src/storage/Chunkifier';
import { blackholeChunkSink } from '../_helpers/blackholeChunkSink';
import { splitToEnd } from '../_helpers/chunks';
import { dataStream, randomString, readToEnd } from '../_helpers/generators';
import { memoryChunkSink } from '../_helpers/memoryChunkSink';

function charSplitter(char: string): ChunkSplitter {
    return (chunk) => {
        const index = chunk.indexOf(char);
        if (index === -1) {
            return [chunk];
        }
        return [chunk.substring(0, index), chunk.substring(index + 1)];
    };
}

function noopSplitter(): ChunkSplitter {
    return (c: string) => [c];
}

describe('ChunkifierSink', () => {
    it('should call splitter function with every chunk', async () => {
        const data = randomString(16384 * 10);
        const splitter = jest.fn(noopSplitter());

        const instance = new WritableStream(
            new ChunkifierSink({
                sink: blackholeChunkSink(),
                splitter: () => splitter,
            }),
        );

        await data.pipeTo(instance);
        expect(splitter).toHaveBeenCalledTimes(10);
    });

    it('should call splitter factory with every new chunk', async () => {
        const data = randomString(500);

        const splitCount = 10;
        let split = 0;
        const splitterFactory = jest.fn(
            (): ChunkSplitter => (chunk) => {
                if (split < splitCount) {
                    split++;
                    return [chunk.substring(0, 10), chunk.substring(10)];
                }
                return [chunk];
            },
        );

        const instance = new WritableStream(
            new ChunkifierSink({
                sink: blackholeChunkSink(),
                splitter: splitterFactory,
            }),
        );

        await data.pipeTo(instance);
        expect(splitterFactory).toHaveBeenCalledTimes(splitCount + 1);
    });

    it('should not call sink on ChunkifierSink creation', () => {
        const splitter = noopSplitter();
        const sink = jest.fn(blackholeChunkSink());

        new ChunkifierSink({
            sink,
            splitter: () => splitter,
        });

        expect(sink).not.toHaveBeenCalled();
    });

    it('should call sink on chunk split', async () => {
        const data = dataStream('bAb');
        const splitter = charSplitter('A');
        const sink = jest.fn(blackholeChunkSink());

        const instance = new WritableStream(
            new ChunkifierSink({
                sink,
                splitter: () => splitter,
            }),
        );

        await data.pipeTo(instance);
        expect(sink).toHaveBeenCalledTimes(2);
    });

    it('should split data into chunks', async () => {
        const dataStr = await readToEnd(randomString(5000));
        const data = dataStream(dataStr);
        const splitter = charSplitter(dataStr[3]);
        const { sink, getResults } = memoryChunkSink();

        const expected = await splitToEnd(dataStream(dataStr), splitter);

        const instance = new WritableStream(
            new ChunkifierSink({
                sink,
                splitter: () => splitter,
                allowEmptyChunks: true,
            }),
        );

        await data.pipeTo(instance);
        const results = getResults();
        expect(results).toEqual(expected);
    });

    it('should split data into non-empty chunks', async () => {
        const dataStr = await readToEnd(randomString(5000));
        const data = dataStream(dataStr);
        const splitter = charSplitter(dataStr[3]);
        const { sink, getResults } = memoryChunkSink();

        const expected = (await splitToEnd(dataStream(dataStr), splitter)).filter((b) => b.length);

        const instance = new WritableStream(
            new ChunkifierSink({
                sink,
                splitter: () => splitter,
                allowEmptyChunks: false,
            }),
        );

        await data.pipeTo(instance);
        const results = getResults();
        expect(results).toEqual(expected);
    });

    it('should create empty chunks if allowEmptyChunks is true', async () => {
        const dataStr = 'abcaaaabcdaaa';
        const data = dataStream(dataStr);
        const splitter = charSplitter('a');
        const { sink, getResults } = memoryChunkSink();

        const expected = ['', 'bc', '', '', '', 'bcd', '', ''];

        const instance = new WritableStream(
            new ChunkifierSink({
                sink,
                splitter: () => splitter,
                allowEmptyChunks: true,
            }),
        );

        await data.pipeTo(instance);
        const results = getResults();
        expect(results).toEqual(expected);
    });

    it('should not create empty chunks if allowEmptyChunks is false', async () => {
        const dataStr = 'abcaaaabcdaaa';
        const data = dataStream(dataStr);
        const splitter = charSplitter('a');
        const { sink, getResults } = memoryChunkSink();

        const expected = ['bc', 'bcd'];

        const instance = new WritableStream(
            new ChunkifierSink({
                sink,
                splitter: () => splitter,
                allowEmptyChunks: false,
            }),
        );

        await data.pipeTo(instance);
        const results = getResults();
        expect(results).toEqual(expected);
    });
});
