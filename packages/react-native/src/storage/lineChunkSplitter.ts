import type { ChunkSplitter } from './Chunkifier';

/**
 * Splits data into chunks with maximum lines.
 * @param maxLines Maximum lines in one chunk.
 */
export function lineChunkSplitter(maxLines: number): ChunkSplitter {
    let seen = 0;

    function findNthLine(data: string, remaining: number): [number, number] {
        let lastIndex = -1;
        let count = 0;
        // eslint-disable-next-line no-constant-condition
        while (true) {
            lastIndex = data.indexOf('\n', lastIndex + 1);
            if (lastIndex === -1) {
                return [-1, count];
            }

            if (remaining === ++count) {
                return [lastIndex + 1, count];
            }
        }
    }

    return function lineChunkSplitter(data) {
        const remainingLines = maxLines - seen;
        const [index, count] = findNthLine(data, remainingLines);
        if (index === -1) {
            seen += count;
            return [data];
        }

        seen = 0;
        return [data.substring(0, index), data.substring(index)];
    };
}
