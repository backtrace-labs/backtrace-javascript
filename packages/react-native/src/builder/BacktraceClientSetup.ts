import type { PartialCoreClientSetup } from '@backtrace/sdk-core';
import type { BacktraceConfiguration } from '../BacktraceConfiguration';
import type { BacktraceStorageModule } from '../storage';
import type { BacktraceStorageModuleFactory } from '../storage/PathBacktraceStorageFactory';

type BaseCoreClientSetup = PartialCoreClientSetup<'sdkOptions' | 'requestHandler' | 'database', BacktraceConfiguration>;

export interface BacktraceClientSetup extends BaseCoreClientSetup {
    readonly storageFactory?: BacktraceStorageModuleFactory;
    readonly database?: Omit<NonNullable<BaseCoreClientSetup['database']>, 'storage'> & {
        readonly storage?: BacktraceStorageModule;
    };
}
