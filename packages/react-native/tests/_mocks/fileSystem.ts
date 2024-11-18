import { MockedFileSystem, mockFileSystem } from '@backtrace/sdk-core/tests/_mocks/fileSystem';
import path from 'path';
import { WritableStream } from 'web-streams-polyfill';
import { FileSystem } from '../../src/storage/FileSystem';

export function mockStreamFileSystem(files?: Record<string, string>): MockedFileSystem<FileSystem> {
    const fs = mockFileSystem(files);

    return {
        ...fs,

        copy: jest.fn().mockImplementation((sourceFile, destinationFile) => {
            fs.files[path.resolve(destinationFile)] = fs.files[path.resolve(sourceFile)];
            return Promise.resolve(true);
        }),

        copySync: jest.fn().mockImplementation((sourceFile, destinationFile) => {
            fs.files[path.resolve(destinationFile)] = fs.files[path.resolve(sourceFile)];
            return true;
        }),

        applicationDirectory: jest.fn().mockImplementation(() => {
            return '/';
        }),

        createWriteStream: jest.fn().mockImplementation((p: string) => {
            const writable = new WritableStream<string>({
                write(str) {
                    const fullPath = path.resolve(p);
                    if (!fs.files[fullPath]) {
                        fs.files[fullPath] = str;
                    } else {
                        fs.files[fullPath] += str;
                    }
                },
            });

            (writable as { path?: string }).path = p;
            return writable;
        }),
    };
}
