// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore The following import fails due to missing extension, but it cannot have one (it imports a .ts file)
import { mockBacktraceStorage } from '@backtrace/sdk-core/tests/_mocks/storage';

import { BacktraceStorageModule } from '@backtrace/sdk-core';
import type { MockedBacktraceStorage } from '@backtrace/sdk-core/tests/_mocks/storage.js';
import { ReadStream, WriteStream } from 'fs';
import { Readable, Writable } from 'stream';
import { NodeFsBacktraceStorage } from '../../src/storage/NodeFsBacktraceStorage.js';
import { NodeFs } from '../../src/storage/nodeFs.js';

type MockedFs = Pick<NodeFs, 'existsSync' | 'createReadStream'>;

export function mockNodeStorageAndFs(
    files?: Record<string, string>,
): MockedBacktraceStorage<Omit<NodeFsBacktraceStorage & MockedFs, 'fs' | 'initialize'>> {
    const storage = mockBacktraceStorage(files) as MockedBacktraceStorage<Omit<BacktraceStorageModule, 'bind'>>;

    return {
        ...storage,

        existsSync: jest.fn().mockImplementation((p: string) => p in storage.files),

        createWriteStream: jest.fn().mockImplementation((p: string) => {
            const writable = new Writable({
                write(chunk, encoding, callback) {
                    const str = Buffer.isBuffer(chunk)
                        ? chunk.toString('utf-8')
                        : typeof chunk === 'string'
                          ? chunk
                          : String(chunk).toString();

                    if (!storage.files[p]) {
                        storage.files[p] = str;
                    } else {
                        storage.files[p] += str;
                    }

                    callback && callback();
                },
            });
            (writable as WriteStream).path = p;
            return writable;
        }),

        createReadStream: jest.fn().mockImplementation((p: string) => {
            const file = storage.files[p];
            if (!file) {
                throw new Error(`File ${p} does not exist`);
            }

            let position = 0;
            const readable = new Readable({
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
            (readable as ReadStream).path = p;
            return readable;
        }),
    };
}
