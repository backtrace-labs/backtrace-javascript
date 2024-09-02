import { SdkOptions } from '@backtrace/sdk-core';

export const AGENT: SdkOptions = {
    langName: 'nodejs',
    langVersion: process.version,
    /**
     * To do - in the build stage, we can inject information
     * about our package name and agent version. Since we don't have
     * it now, I'm leaving it hardcoded, but in the future we want
     * to change it and use webpack to generate it
     */
    agent: 'BACKTRACE_AGENT_NAME',
    agentVersion: 'BACKTRACE_AGENT_VERSION',
};
