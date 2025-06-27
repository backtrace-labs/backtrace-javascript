import { MockedBacktraceStorage, mockBacktraceStorage } from '@backtrace/sdk-core/tests/_mocks/storage';
import { WritableStream } from 'web-streams-polyfill';
import { BacktraceStorageModule } from '../../src';

export function mockStreamFileSystem(
    files?: Record<string, string>,
): MockedBacktraceStorage<Omit<BacktraceStorageModule, 'bind'>> {
    const fs = mockBacktraceStorage(files);

    return {
        ...fs,

        createDirSync: jest.fn().mockReturnValue(true),

        getFullPath: jest.fn().mockImplementation((v) => v),

        createWriteStream: jest.fn().mockImplementation((p: string) => {
            const writable = new WritableStream<string>({
                write(str) {
                    if (!fs.files[p]) {
                        fs.files[p] = str;
                    } else {
                        fs.files[p] += str;
                    }
                },
            });

            (writable as { path?: string }).path = p;
            return writable;
        }),
    };
}
