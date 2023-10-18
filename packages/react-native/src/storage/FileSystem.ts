import { type FileSystem as CoreFileSystem } from '@backtrace-labs/sdk-core';
import { type StreamWriter } from './StreamWriter';
export interface FileSystem extends CoreFileSystem {
    renameSync(source: string, destination: string): boolean;
    rename(source: string, destination: string): Promise<boolean>;
    applicationDirectory(): string;
    streamWriter: StreamWriter;
}
