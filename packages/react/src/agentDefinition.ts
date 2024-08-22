import type { SdkOptions } from '@backtrace/sdk-core';

export const AGENT: SdkOptions = {
    langName: 'react',
    langVersion: navigator.userAgent,
    agent: 'BACKTRACE_AGENT_NAME',
    agentVersion: 'BACKTRACE_AGENT_VERSION',
};
