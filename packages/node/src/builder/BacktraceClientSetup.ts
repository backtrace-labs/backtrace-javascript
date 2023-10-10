import { PartialCoreClientSetup } from '@backtrace-labs/sdk-core';
import { BacktraceSetupConfiguration } from '../BacktraceConfiguration';

export interface BacktraceClientSetup extends PartialCoreClientSetup<'sdkOptions' | 'requestHandler'> {}

export type BacktraceNodeClientSetup = Omit<BacktraceClientSetup, 'options'> & {
    readonly options: BacktraceSetupConfiguration;
};
