import { MockedFileSystem, mockFileSystem } from '@backtrace/sdk-core/tests/_mocks/fileSystem';
import { randomUUID } from 'crypto';
import path from 'path';
import { StreamWriter } from '../../src';
import { FileSystem } from '../../src/storage/FileSystem';

function mockStreamWriter(files: Record<string, string>): StreamWriter {
    const streams = new Map<string, string>();
    return {
        create(source) {
            const id = randomUUID();
            const fullPath = path.resolve(source);
            streams.set(id, fullPath);
            files[fullPath] = '';
            return id;
        },
        append(key, content) {
            const source = streams.get(key);
            if (!source) {
                return Promise.resolve(false);
            }
            files[source] += content;
            return Promise.resolve(true);
        },
        close(key) {
            const source = streams.get(key);
            if (!source) {
                return false;
            }

            streams.delete(key);
            return true;
        },
    };
}

export function mockReactFileSystem(files?: Record<string, string>): MockedFileSystem<FileSystem> {
    const fs = mockFileSystem(files);

    return {
        ...fs,

        copy: jest.fn().mockImplementation((sourceFile: string, destinationFile: string) => {
            const src = fs.files[path.resolve(sourceFile)];
            if (!src) {
                return Promise.resolve(false);
            }

            fs.files[path.resolve(destinationFile)] = src;
            return Promise.resolve(true);
        }),

        copySync: jest.fn().mockImplementation((sourceFile: string, destinationFile: string) => {
            const src = fs.files[path.resolve(sourceFile)];
            if (!src) {
                return false;
            }

            fs.files[path.resolve(destinationFile)] = src;
            return true;
        }),

        applicationDirectory: jest.fn().mockReturnValue(path.resolve('.')),
        streamWriter: mockStreamWriter(fs.files),
    };
}
