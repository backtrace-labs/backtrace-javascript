import { MockedFileSystem, mockFileSystem } from '@backtrace/sdk-core/tests/_mocks/fileSystem';
import path from 'path';
import { Writable } from 'stream';
import { NodeFileSystem, WritableStream } from '../../src/storage/interfaces/NodeFileSystem.js';

export function mockStreamFileSystem(files?: Record<string, string>): MockedFileSystem<NodeFileSystem> {
    const fs = mockFileSystem(files);

    return {
        ...fs,

        rename: jest.fn().mockImplementation((oldPath: string, newPath: string) => {
            const old = fs.files[path.resolve(oldPath)];
            delete fs.files[path.resolve(oldPath)];
            fs.files[path.resolve(newPath)] = old;
            return Promise.resolve();
        }),
        renameSync: jest.fn().mockImplementation((oldPath: string, newPath: string) => {
            const old = fs.files[path.resolve(oldPath)];
            delete fs.files[path.resolve(oldPath)];
            fs.files[path.resolve(newPath)] = old;
        }),

        createWriteStream: jest.fn().mockImplementation((p: string) => {
            const writable = new Writable({
                write(chunk, encoding, callback) {
                    const str = Buffer.isBuffer(chunk)
                        ? chunk.toString('utf-8')
                        : typeof chunk === 'string'
                          ? chunk
                          : String(chunk).toString();

                    const fullPath = path.resolve(p);
                    if (!fs.files[fullPath]) {
                        fs.files[fullPath] = str;
                    } else {
                        fs.files[fullPath] += str;
                    }

                    callback && callback();
                },
            });

            (writable as Partial<WritableStream>).close = () => writable.end();
            (writable as Partial<WritableStream>).writeSync = (chunk) => writable.write(chunk);

            return writable;
        }),
    };
}
