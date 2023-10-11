import { PartialCoreClientSetup } from '@backtrace-labs/sdk-core';
import { BacktraceConfiguration } from '../BacktraceConfiguration';

export interface BacktraceClientSetup<O extends BacktraceConfiguration = BacktraceConfiguration>
    extends PartialCoreClientSetup<'sdkOptions' | 'requestHandler', O> {}
