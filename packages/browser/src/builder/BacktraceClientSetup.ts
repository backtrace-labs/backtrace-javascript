import { PartialCoreClientSetup } from '@backtrace/sdk-core';
import { BacktraceConfiguration } from '../BacktraceConfiguration.js';

export interface BacktraceClientSetup<O extends BacktraceConfiguration = BacktraceConfiguration>
    extends PartialCoreClientSetup<'sdkOptions' | 'requestHandler', O> {}
