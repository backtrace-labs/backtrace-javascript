import { type FileSystem as CoreFileSystem } from '@backtrace/sdk-core';
import type { FileWritableStream } from './StreamWriter';
export interface FileSystem extends CoreFileSystem {
    copy(sourceFile: string, destinationFile: string): Promise<boolean>;
    copySync(sourceFile: string, destinationFile: string): boolean;
    applicationDirectory(): string;
    createWriteStream(path: string): FileWritableStream;
}
