import { FileSystem } from '@backtrace/sdk-core';
import { Readable, Writable } from 'stream';

export interface NodeFileSystem extends FileSystem {
    createReadStream(path: string): Readable;
    createWriteStream(path: string): Writable;
    rename(oldPath: string, newPath: string): Promise<void>;
    renameSync(oldPath: string, newPath: string): void;
}
