import { ChunkSplitter } from './chunkifier.js';

/**
 * Combines several splitters into one.
 *
 * Each splitter is checked, in order that they are passed.
 * Splitters receive always the first chunk.
 *
 * If more than one splitter returns splitted chunks, the second
 * chunks are concatenated and treated as one chunk.
 * @param splitters
 * @returns
 */
export function combinedChunkSplitter(...splitters: ChunkSplitter[]): ChunkSplitter {
    return (chunk, encoding) => {
        const rest: Buffer[] = [];

        for (const splitter of splitters) {
            const [c1, c2] = splitter(chunk, encoding);
            chunk = c1;
            if (c2) {
                // Prepend second chunk to the rest
                rest.unshift(c2);
            }
        }

        // If any chunks are in rest, concatenate them and pass as the second chunk
        return [chunk, rest.length ? Buffer.concat(rest) : undefined];
    };
}
