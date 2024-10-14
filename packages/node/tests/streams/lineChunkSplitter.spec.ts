import { Readable } from 'stream';
import { lineChunkSplitter } from '../../src/streams/lineChunkSplitter.js';
import { chunkify, splitToEnd } from '../_helpers/chunks.js';
import { randomLines, readLines } from '../_helpers/generators.js';

function countNewlines(buffer: Buffer) {
    return buffer.reduce((sum, c) => (c === '\n'.charCodeAt(0) ? sum + 1 : sum), 0);
}

async function getData(lines: number) {
    return Buffer.from((await readLines(randomLines(10, 20), lines)).join('\n') + '\n');
}

describe('lineChunkSplitter', () => {
    it('should split chunk if it has more lines than maxLines', async () => {
        const maxLines = 10;
        const chunk = await getData(30);
        const splitter = lineChunkSplitter(maxLines);

        const [c1, c2] = splitter(chunk, 'utf-8');
        expect(countNewlines(c1)).toEqual(maxLines); // include trailing newline
        expect(c2 && countNewlines(c2)).toEqual(30 - maxLines);
    });

    it('should split chunk if total seen lines is more than maxLines', async () => {
        const maxLines = 100;
        const chunk = await getData(30);
        const splitter = lineChunkSplitter(maxLines);

        splitter(chunk, 'utf-8');
        splitter(chunk, 'utf-8');
        splitter(chunk, 'utf-8');
        const [c1, c2] = splitter(chunk, 'utf-8');

        expect(countNewlines(c1)).toEqual(100 - 30 * 3);
        expect(c2 && countNewlines(c2)).toEqual(20);
    });

    it('should not split chunk if it has less lines than maxLines', async () => {
        const maxLines = 100;
        const chunk = await getData(30);
        const splitter = lineChunkSplitter(maxLines);
        const [c1, c2] = splitter(chunk, 'utf-8');

        expect(countNewlines(c1)).toEqual(30);
        expect(c2).toBeUndefined();
    });

    it('should not split chunk if it has maxLines lines', async () => {
        const maxLines = 100;
        const chunk = await getData(maxLines);
        const splitter = lineChunkSplitter(maxLines);
        const [c1, c2] = splitter(chunk, 'utf-8');

        expect(countNewlines(c1)).toEqual(maxLines);
        expect(c2?.length).toEqual(0);
    });

    it('should split chunk by lines', async () => {
        const maxLines = 123;
        const data = await getData(1000);
        const splitter = lineChunkSplitter(maxLines);
        const actual = await splitToEnd(Readable.from(chunkify(data, 100)), splitter);

        let seen = 0;
        for (let i = 0; i < actual.length; i++) {
            const chunk = actual[i];
            const start = seen;
            const end = seen + chunk.length;
            expect(chunk).toEqual(data.subarray(start, end));
            seen += chunk.length;

            if (i === actual.length - 1) {
                expect(countNewlines(chunk)).toBeLessThanOrEqual(maxLines);
            } else {
                expect(countNewlines(chunk)).toEqual(maxLines);
            }
        }
    });
});
