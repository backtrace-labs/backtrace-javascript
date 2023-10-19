import { MetricsQueue } from '@backtrace-labs/sdk-core';

export class StubMetricsQueue<T> implements MetricsQueue<T> {
    public readonly total = 0;
    public readonly submissionUrl = '';
    public readonly maximumEvents = 0;

    public add(): void {
        return;
    }

    public send(): Promise<void> {
        return Promise.resolve();
    }
}
