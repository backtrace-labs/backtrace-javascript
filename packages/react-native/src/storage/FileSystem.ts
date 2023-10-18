import { type FileSystem as CoreFileSystem } from '@backtrace-labs/sdk-core';
import { type StreamWriter } from './StreamWriter';
export interface FileSystem extends CoreFileSystem {
    copy(sourceFile: string, destinationFile: string): Promise<boolean>;
    copySync(sourceFile: string, destinationFile: string): boolean;
    applicationDirectory(): string;
    streamWriter: StreamWriter;
}
