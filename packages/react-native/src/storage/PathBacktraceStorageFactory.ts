import { type BacktraceStorageModule, type BacktraceStorageModuleOptions } from './storage.js';

export interface BacktraceStorageModuleFactory {
    create(options: BacktraceStorageModuleOptions): BacktraceStorageModule;
}
