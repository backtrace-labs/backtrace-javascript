import type { ChunkSplitter } from './Chunkifier';

/**
 * Splits data into chunks with maximum length.
 * @param maxLength Maximum length of one chunk.
 * @param wholeLines Can be one of:
 * * `"skip"` - if last line does not fit in the chunk, it will be skipped entirely
 * * `"break"` - if last line does not fit in the chunk, it will be broken into two new chunks
 * * `false` - last line will be always broken into old and new chunk
 */
export function lengthChunkSplitter(
    maxLength: number,
    wholeLines: 'skip' | 'break' | false = false,
): ChunkSplitter<string> {
    let seen = 0;

    const emptyBuffer = '';

    return function lengthChunkSplitter(data) {
        const remainingLength = maxLength - seen;
        if (data.length <= remainingLength) {
            seen += data.length;
            return [data];
        }

        seen = 0;
        if (!wholeLines) {
            return [data.substring(0, remainingLength), data.substring(remainingLength)];
        }

        // Check last newline before first chunk end
        const lastLineIndex = data.substring(0, remainingLength).lastIndexOf('\n');

        // If there is no newline, pass empty buffer as the first chunk
        // and write all data into the second
        if (lastLineIndex === -1) {
            if (remainingLength !== maxLength) {
                return [emptyBuffer, data];
            }

            if (wholeLines === 'break') {
                // Break the line into two chunks
                return [data.substring(0, remainingLength), data.substring(remainingLength)];
            } else {
                const firstNewLine = data.indexOf('\n', remainingLength);
                if (firstNewLine === -1) {
                    return [emptyBuffer];
                }

                return [emptyBuffer, data.substring(firstNewLine + 1)];
            }
        }

        // +1 - include trailing newline in first chunk, skip in second
        return [data.substring(0, lastLineIndex + 1), data.substring(lastLineIndex + 1)];
    };
}
