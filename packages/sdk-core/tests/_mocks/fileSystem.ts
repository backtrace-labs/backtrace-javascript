import path from 'path';
import { BacktraceFileAttachment } from '../../src/model/attachment';
import { FileSystem } from '../../src/modules/storage/FileSystem';
import { Mocked } from './types';

export type MockedFileSystem<T extends FileSystem> = Mocked<T> & { files: Record<string, string> };

export function mockFileSystem(files?: Record<string, string>): MockedFileSystem<FileSystem> {
    const fs = Object.entries(files ?? {})
        .map(([k, v]) => [path.resolve(k), v])
        .reduce(
            (obj, [k, v]) => {
                obj[k] = v;
                return obj;
            },
            {} as Record<string, string>,
        );

    function readDir(dir: string) {
        return Object.keys(fs)
            .filter((k) => path.dirname(k) === path.resolve(dir))
            .map((p) => path.basename(p));
    }

    return {
        files: fs,

        readDir: jest.fn().mockImplementation((dir: string) => Promise.resolve(readDir(dir))),
        readDirSync: jest.fn().mockImplementation(readDir),

        createDir: jest.fn().mockReturnValue(Promise.resolve()),
        createDirSync: jest.fn(),

        readFile: jest.fn().mockImplementation((p: string) => Promise.resolve(fs[path.resolve(p)])),
        readFileSync: jest.fn().mockImplementation((p: string) => fs[path.resolve(p)]),

        writeFile: jest.fn().mockImplementation((p: string, c: string) => Promise.resolve((fs[path.resolve(p)] = c))),
        writeFileSync: jest.fn().mockImplementation((p: string, c: string) => (fs[path.resolve(p)] = c)),

        unlink: jest.fn().mockImplementation((p: string) => {
            delete fs[path.resolve(p)];
            return Promise.resolve();
        }),
        unlinkSync: jest.fn().mockImplementation((p: string) => {
            delete fs[path.resolve(p)];
        }),

        exists: jest.fn().mockImplementation((p: string) => Promise.resolve(path.resolve(p) in fs)),
        existsSync: jest.fn().mockImplementation((p: string) => path.resolve(p) in fs),

        createAttachment: jest.fn().mockImplementation(
            (p: string) =>
                ({
                    filePath: p,
                    name: path.basename(p),
                    get: jest.fn().mockReturnValue(fs[path.resolve(p)]),
                }) as BacktraceFileAttachment,
        ),
    };
}
