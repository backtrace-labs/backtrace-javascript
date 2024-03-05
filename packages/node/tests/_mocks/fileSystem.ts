import { MockedFileSystem, mockFileSystem } from '@backtrace/sdk-core/tests/_mocks/fileSystem.js';
import path from 'path';
import { Readable, Writable } from 'stream';
import { NodeFileSystem } from '../../src/storage/interfaces/NodeFileSystem.js';

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
            return new Writable({
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
        }),

        createReadStream: jest.fn().mockImplementation((p: string) => {
            const fullPath = path.resolve(p);
            const file = fs.files[fullPath];
            if (!file) {
                throw new Error(`File ${p} does not exist`);
            }

            let position = 0;
            return new Readable({
                read(size) {
                    const chunk = file.substring(position, position + size);
                    if (!chunk) {
                        this.push(null);
                    } else {
                        this.push(Buffer.from(chunk));
                        position += size;
                    }
                },
            });
        }),
    };
}
