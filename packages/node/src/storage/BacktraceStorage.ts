import { BacktraceStorageModule as CoreBacktraceStorageModule } from '@backtrace/sdk-core';
import nodeFs from 'fs';
import { BacktraceConfiguration } from '../BacktraceConfiguration.js';
import { NodeFs } from './nodeFs.js';

export interface ReadonlyBacktraceStreamStorage {
    createReadStream(key: string): nodeFs.ReadStream;
}

export interface BacktraceStreamStorage extends ReadonlyBacktraceStreamStorage {
    createWriteStream(key: string): nodeFs.WriteStream;
}

export type BacktraceStorageModule = CoreBacktraceStorageModule<BacktraceConfiguration> & BacktraceStreamStorage;

export interface BacktraceStorageModuleOptions {
    readonly path: string;
    readonly createDirectory?: boolean;
    readonly fs?: NodeFs;
}
