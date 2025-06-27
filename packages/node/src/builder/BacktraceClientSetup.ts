import { PartialCoreClientSetup } from '@backtrace/sdk-core';
import { BacktraceSetupConfiguration } from '../BacktraceConfiguration.js';
import { BacktraceStorageModule } from '../storage/BacktraceStorage.js';
import { BacktraceStorageModuleFactory } from '../storage/BacktraceStorageModuleFactory.js';
import { NodeFs } from '../storage/nodeFs.js';

export interface BacktraceClientSetup extends PartialCoreClientSetup<'sdkOptions' | 'requestHandler'> {}

export type BacktraceNodeClientSetup = Omit<BacktraceClientSetup, 'options' | 'database'> & {
    readonly options: BacktraceSetupConfiguration;
    readonly storageFactory?: BacktraceStorageModuleFactory;
    readonly fs?: NodeFs;
    readonly database?: Omit<NonNullable<BacktraceClientSetup['database']>, 'storage'> & {
        readonly storage?: BacktraceStorageModule;
    };
};
