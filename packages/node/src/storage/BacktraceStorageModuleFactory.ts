import { BacktraceStorageModule, BacktraceStorageModuleOptions } from './BacktraceStorage.js';

export interface BacktraceStorageModuleFactory {
    create(options: BacktraceStorageModuleOptions): BacktraceStorageModule;
}
