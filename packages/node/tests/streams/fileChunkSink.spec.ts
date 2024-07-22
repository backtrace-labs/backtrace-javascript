import path from 'path';
import { Writable } from 'stream';
import { FileChunkSink } from '../../src/streams/fileChunkSink';
import { mockStreamFileSystem } from '../_mocks/fileSystem';

function writeAndClose(stream: Writable, value: string) {
    return new Promise((resolve, reject) => {
        stream.on('error', reject);
        stream.write(value, () => {
            stream.end(resolve);
        });
    });
}

function sortString(a: string, b: string) {
    return a.localeCompare(b);
}

describe('fileChunkSink', () => {
    it('should create a filestream with name from filename', async () => {
        const fs = mockStreamFileSystem();
        const filename = 'abc';
        const sink = new FileChunkSink({ file: () => filename, maxFiles: Infinity, fs });

        const stream = sink.getSink()(0);
        expect(stream.path).toEqual(filename);
    });

    it('should create a filestream each time it is called', async () => {
        const fs = mockStreamFileSystem();
        const dir = 'test';
        const sink = new FileChunkSink({ file: (n) => path.join(dir, n.toString()), maxFiles: Infinity, fs });
        const expected = [0, 2, 5];

        for (const n of expected) {
            const stream = sink.getSink()(n);
            await writeAndClose(stream, 'a');
        }

        const actual = await fs.readDir(dir);
        expect(actual.sort(sortString)).toEqual(expected.map((e) => e.toString()).sort(sortString));
    });

    it('should remove previous files if count exceeds maxFiles', async () => {
        const fs = mockStreamFileSystem();
        const dir = 'test';
        const maxFiles = 3;
        const sink = new FileChunkSink({ file: (n) => path.join(dir, n.toString()), maxFiles, fs });
        const files = [0, 2, 5, 6, 79, 81, 38, -1, 3];
        const expected = files.slice(-maxFiles);

        for (const n of files) {
            const stream = sink.getSink()(n);
            await writeAndClose(stream, 'a');
        }

        const actual = await fs.readDir(dir);
        expect(actual.sort(sortString)).toEqual(expected.map((e) => e.toString()).sort(sortString));
    });
});
