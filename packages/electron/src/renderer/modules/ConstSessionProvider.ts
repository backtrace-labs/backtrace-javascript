import { BacktraceSessionProvider } from '@backtrace/sdk-core';

export class ConstSessionProvider implements BacktraceSessionProvider {
    public readonly newSession = true;

    constructor(public readonly sessionId: string) {}

    public get lastActive(): number {
        return 0;
    }

    public afterMetricsSubmission(): void {
        // Do nothing
    }

    public shouldSend(): boolean {
        return true;
    }
}
