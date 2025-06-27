import { BacktraceStorageModule } from '../../src/index.js';
import { Mocked } from './types.js';

export type MockedBacktraceStorage<T extends BacktraceStorageModule> = Mocked<T> & { files: Record<string, string> };

export function mockBacktraceStorage(files?: Record<string, string>): MockedBacktraceStorage<BacktraceStorageModule> {
    const fs = Object.entries(files ?? {}).reduce(
        (obj, [k, v]) => {
            obj[k] = v;
            return obj;
        },
        {} as Record<string, string>,
    );

    async function* keys() {
        for (const key of Object.keys(fs)) {
            yield key;
        }
    }

    function* keysSync() {
        for (const key of Object.keys(fs)) {
            yield key;
        }
    }

    return {
        files: fs,

        keys: jest.fn().mockImplementation(keys),
        keysSync: jest.fn().mockImplementation(keysSync),

        get: jest.fn().mockImplementation((p: string) => Promise.resolve(fs[p])),
        getSync: jest.fn().mockImplementation((p: string) => fs[p]),

        set: jest.fn().mockImplementation((p: string, c: string) => Promise.resolve((fs[p] = c))),
        setSync: jest.fn().mockImplementation((p: string, c: string) => (fs[p] = c)),

        remove: jest.fn().mockImplementation((p: string) => {
            delete fs[p];
            return Promise.resolve();
        }),
        removeSync: jest.fn().mockImplementation((p: string) => {
            delete fs[p];
        }),

        has: jest.fn().mockImplementation((p: string) => Promise.resolve(p in fs)),
        hasSync: jest.fn().mockImplementation((p: string) => p in fs),
    };
}
