import { PartialCoreClientSetup } from '@backtrace/sdk-core';
import nodeFs from 'fs';
import { BacktraceSetupConfiguration } from '../BacktraceConfiguration.js';
import { BacktraceStorageModule } from '../storage/BacktraceStorage.js';
import { BacktraceStorageModuleFactory } from '../storage/BacktraceStorageModuleFactory.js';

export interface BacktraceClientSetup extends PartialCoreClientSetup<'sdkOptions' | 'requestHandler'> {}

export type BacktraceNodeClientSetup = Omit<BacktraceClientSetup, 'options' | 'database'> & {
    readonly options: BacktraceSetupConfiguration;
    readonly storageFactory?: BacktraceStorageModuleFactory;
    readonly fs?: typeof nodeFs;
    readonly database?: Omit<NonNullable<BacktraceClientSetup['database']>, 'storage'> & {
        readonly storage?: BacktraceStorageModule;
    };
};
