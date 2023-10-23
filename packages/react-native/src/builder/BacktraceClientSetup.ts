import type { PartialCoreClientSetup } from '@backtrace/sdk-core';
import type { BacktraceConfiguration } from '../BacktraceConfiguration';

export interface BacktraceClientSetup
    extends PartialCoreClientSetup<'sdkOptions' | 'requestHandler', BacktraceConfiguration> {}
