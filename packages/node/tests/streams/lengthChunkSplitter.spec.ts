import { Readable } from 'stream';
import { lengthChunkSplitter } from '../../src/streams/lengthChunkSplitter';
import { chunkify, splitToEnd } from '../_helpers/chunks';
import { randomString } from '../_helpers/generators';

describe('lengthChunkSplitter', () => {
    it('should split chunk if it is larger than maxLength', () => {
        const maxLength = 10;
        const chunk = randomString().read(30);
        const splitter = lengthChunkSplitter(maxLength);

        const [c1, c2] = splitter(chunk, 'utf-8');
        expect(c1.length).toEqual(maxLength);
        expect(c2?.length).toEqual(30 - maxLength);
    });

    it('should split chunk if total seen length is larger than maxLength', () => {
        const maxLength = 100;
        const chunk = randomString().read(30);
        const splitter = lengthChunkSplitter(maxLength);

        splitter(chunk, 'utf-8');
        splitter(chunk, 'utf-8');
        splitter(chunk, 'utf-8');
        const [c1, c2] = splitter(chunk, 'utf-8');

        expect(c1.length).toEqual(100 - 30 * 3);
        expect(c2?.length).toEqual(20);
    });

    it('should not split chunk if it is smaller than maxLength', () => {
        const maxLength = 100;
        const chunk = randomString().read(30);
        const splitter = lengthChunkSplitter(maxLength);
        const [c1, c2] = splitter(chunk, 'utf-8');

        expect(c1.length).toEqual(30);
        expect(c2).toBeUndefined();
    });

    it('should not split chunk if it is equal to maxLength', () => {
        const maxLength = 100;
        const chunk = randomString().read(maxLength);
        const splitter = lengthChunkSplitter(maxLength);
        const [c1, c2] = splitter(chunk, 'utf-8');

        expect(c1.length).toEqual(maxLength);
        expect(c2).toBeUndefined();
    });

    it('should split chunk by length', async () => {
        const maxLength = 123;
        const data: Buffer = randomString().read(1000);
        const splitter = lengthChunkSplitter(maxLength);
        const actual = await splitToEnd(Readable.from(chunkify(data, 100)), splitter);

        for (let i = 0; i < actual.length; i++) {
            const chunk = actual[i];
            expect(chunk.length).toBeLessThanOrEqual(maxLength);
            expect(chunk).toEqual(data.subarray(i * maxLength, (i + 1) * maxLength));
        }
    });

    describe('whole lines', () => {
        it('should split chunk on length with whole lines and break longer lines', async () => {
            const data = Buffer.from('a\nb\ncde\nfghijklmno\npqrs\ntuv\nwxyz');
            const maxLength = 4;
            const expected = ['a\nb\n', 'cde\n', 'fghi', 'jklm', 'no\n', 'pqrs', '\n', 'tuv\n', 'wxyz'];

            const splitter = lengthChunkSplitter(maxLength, 'break');
            const actual = (await splitToEnd(Readable.from(data), splitter)).map((b) => b.toString('utf-8'));

            expect(actual).toEqual(expected);
        });

        it('should split chunk on length with whole lines and skip longer lines', async () => {
            const data = Buffer.from('a\nb\ncde\nfghijklmno\npqrs\ntuv\nwxyz');
            const maxLength = 4;
            const expected = ['a\nb\n', 'cde\n', '', '', 'tuv\n', 'wxyz'];

            const splitter = lengthChunkSplitter(maxLength, 'skip');
            const actual = (await splitToEnd(Readable.from(data), splitter)).map((b) => b.toString('utf-8'));

            expect(actual).toEqual(expected);
        });
    });
});
