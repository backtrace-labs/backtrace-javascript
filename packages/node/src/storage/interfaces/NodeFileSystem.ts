import { FileSystem } from '@backtrace/sdk-core';
import { ReadStream, WriteStream } from 'fs';

export interface NodeFileSystem extends FileSystem {
    createReadStream(path: string): ReadStream;
    createWriteStream(path: string): WriteStream;
    rename(oldPath: string, newPath: string): Promise<void>;
    renameSync(oldPath: string, newPath: string): void;
}
