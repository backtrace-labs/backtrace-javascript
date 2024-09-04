import { ChunkSplitter } from './chunkifier.js';

/**
 * Splits data into chunks with maximum length.
 * @param maxLength Maximum length of one chunk.
 * @param wholeLines If `true`, will split chunks before newlines, so whole lines are passed to the chunk.
 */
export function lengthChunkSplitter(maxLength: number, wholeLines: 'skip' | 'break' | false = false): ChunkSplitter {
    let seen = 0;

    const emptyBuffer = Buffer.of();

    return function lengthChunkSplitter(data) {
        const remainingLength = maxLength - seen;
        if (data.length <= remainingLength) {
            seen += data.length;
            return [data];
        }

        seen = 0;
        if (!wholeLines) {
            return [data.subarray(0, remainingLength), data.subarray(remainingLength)];
        }

        // Check last newline before first chunk end
        const lastLineIndex = data.subarray(0, remainingLength).lastIndexOf('\n');

        // If there is no newline, pass empty buffer as the first chunk
        // and write all data into the second
        if (lastLineIndex === -1) {
            if (remainingLength !== maxLength) {
                return [emptyBuffer, data];
            }

            if (wholeLines === 'break') {
                // Break the line into two chunks
                return [data.subarray(0, remainingLength), data.subarray(remainingLength)];
            } else {
                const firstNewLine = data.indexOf('\n', remainingLength);
                if (firstNewLine === -1) {
                    return [emptyBuffer];
                }

                return [emptyBuffer, data.subarray(firstNewLine + 1)];
            }
        }

        // +1 - include trailing newline in first chunk, skip in second
        return [data.subarray(0, lastLineIndex + 1), data.subarray(lastLineIndex + 1)];
    };
}
