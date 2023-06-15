import { SdkOptions } from '@backtrace/sdk-core/src/builder/SdkOptions';

export const AGENT: SdkOptions = {
    langName: 'nodejs',
    langVersion: process.version,
    /**
     * To do - in the build stage, we can inject information
     * about our package name and agent version. Since we don't have
     * it now, I'm leaving it hardcoded, but in the future we want
     * to change it and use webpack to generate it
     */
    agent: 'backtrace-node',
    agentVersion: '0.0.1',
};
