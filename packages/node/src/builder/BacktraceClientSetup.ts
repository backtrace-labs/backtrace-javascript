import { PartialCoreClientSetup } from '@backtrace/sdk-core';
import { BacktraceSetupConfiguration } from '../BacktraceConfiguration';
import { NodeFileSystem } from '../storage/interfaces/NodeFileSystem';

export interface BacktraceClientSetup extends PartialCoreClientSetup<'sdkOptions' | 'requestHandler'> {}

export type BacktraceNodeClientSetup = Omit<BacktraceClientSetup, 'options'> & {
    readonly options: BacktraceSetupConfiguration;
    readonly fileSystem?: NodeFileSystem;
};
