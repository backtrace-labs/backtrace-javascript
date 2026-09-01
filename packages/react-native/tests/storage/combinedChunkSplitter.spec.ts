import { combinedChunkSplitter } from '../../src/storage/combinedChunkSplitter';
import { lengthChunkSplitter } from '../../src/storage/lengthChunkSplitter';
import { lineChunkSplitter } from '../../src/storage/lineChunkSplitter';

const join = (chunks: string[]) => chunks.join('');

describe('combinedChunkSplitter', () => {
    it('should split when any splitter splits', () => {
        const splitter = combinedChunkSplitter(join, lengthChunkSplitter(4), lineChunkSplitter(10));

        const [c1, c2] = splitter('abcdefgh');

        expect(c1).toEqual('abcd');
        expect(c2).toEqual('efgh');
    });

    it('should not split when no splitter splits', () => {
        const splitter = combinedChunkSplitter(join, lineChunkSplitter(10), lengthChunkSplitter(1000));

        const [c1, c2] = splitter('line-1\n');

        expect(c1).toEqual('line-1\n');
        expect(c2).toBeUndefined();
    });

    it('should keep the split when the second chunk is empty', () => {
        const splitter = combinedChunkSplitter(join, lineChunkSplitter(2), lengthChunkSplitter(1000, 'skip'));

        splitter('line-1\n');
        const [c1, c2] = splitter('line-2\n');

        expect(c1).toEqual('line-2\n');
        expect(c2).toBeDefined();
        expect(c2?.length).toEqual(0);
    });
});
