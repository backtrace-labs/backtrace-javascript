import type { BacktraceStorageModule as CoreBacktraceStorageModule } from '@backtrace/sdk-core';
import type { BacktraceConfiguration } from '../BacktraceConfiguration';
import type { FileWritableStream } from './StreamWriter';

export interface BacktraceStreamStorage {
    createWriteStream(key: string): FileWritableStream;
}

export interface BacktraceDirectorySyncStorage {
    createDirSync(dir: string): boolean;
}

export interface BacktracePathStorage {
    getFullPath(path: string): string;
}

export type BacktraceStorageModule = CoreBacktraceStorageModule<BacktraceConfiguration> &
    BacktraceStreamStorage &
    BacktraceDirectorySyncStorage &
    BacktracePathStorage;

export interface BacktraceStorageModuleOptions {
    readonly path: string;
    readonly createDirectory?: boolean;
}
