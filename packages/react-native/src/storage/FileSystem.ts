import { type FileSystem as CoreFileSystem } from '@backtrace-labs/sdk-core';
import { type StreamWriter } from './StreamWriter';
export interface FileSystem extends CoreFileSystem {
    applicationDirectory(): string;
    streamWriter: StreamWriter;
}
