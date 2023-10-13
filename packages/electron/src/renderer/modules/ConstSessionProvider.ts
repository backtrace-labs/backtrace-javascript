import { BacktraceSessionProvider } from '@backtrace-labs/sdk-core';

export class ConstSessionProvider implements BacktraceSessionProvider {
    public readonly newSession = true;

    constructor(public readonly sessionId: string) {}

    public get lastActive(): number {
        return 0;
    }

    public afterMetricsSubmission(): void {}

    public shouldSend(): boolean {
        return true;
    }
}
