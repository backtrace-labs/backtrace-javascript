import { FileSystem } from '@backtrace/sdk-core';

export interface WritableStream {
    write(chunk: string, callback?: (err?: Error | null) => void): void;
    writeSync(chunk: string): void;
    close(): void;
}

export interface NodeFileSystem extends FileSystem {
    createWriteStream(path: string): WritableStream;
    rename(oldPath: string, newPath: string): Promise<void>;
    renameSync(oldPath: string, newPath: string): void;
}
