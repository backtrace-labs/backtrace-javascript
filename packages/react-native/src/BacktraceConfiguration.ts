import { type BacktraceConfiguration as ReactConfiguration } from '@backtrace-labs/react';
export interface BacktraceConfiguration extends Omit<ReactConfiguration, 'name' | 'version'> {}
