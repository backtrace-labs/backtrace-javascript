import { BacktraceConfiguration } from '../../index.js';
import { BacktraceModule } from '../BacktraceModule.js';

export interface BacktraceReadonlyStorage {
    get(key: string): Promise<string | undefined>;
    has(key: string): Promise<boolean>;
}

export interface BacktraceIterableStorage {
    keys(): AsyncGenerator<string>;
}

export interface BacktraceStorage extends BacktraceReadonlyStorage {
    set(key: string, value: string): Promise<boolean>;
    remove(key: string): Promise<boolean>;
}

export interface BacktraceReadonlySyncStorage {
    getSync(key: string): string | undefined;
    hasSync(key: string): boolean;
}

export interface BacktraceSyncStorage extends BacktraceReadonlySyncStorage {
    setSync(key: string, value: string): boolean;
    removeSync(key: string): boolean;
}

export interface BacktraceIterableSyncStorage {
    keysSync(): Generator<string>;
}

export type BacktraceStorageModule<O extends BacktraceConfiguration = BacktraceConfiguration> = BacktraceModule<O> &
    BacktraceStorage &
    BacktraceSyncStorage &
    BacktraceIterableStorage &
    BacktraceIterableSyncStorage;
