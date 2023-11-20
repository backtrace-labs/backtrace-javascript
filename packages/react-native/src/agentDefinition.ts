import type { SdkOptions } from '@backtrace/sdk-core/lib/builder/SdkOptions';

// These variables will be set on compilation stage
// declare const BACKTRACE_AGENT_NAME: string;
// declare const BACKTRACE_AGENT_VERSION: string;

export const AGENT: SdkOptions = {
    langName: 'nodejs',
    langVersion: process.version,
    agent: 'BACKTRACE_AGENT_NAME',
    agentVersion: 'BACKTRACE_AGENT_VERSION',
};
