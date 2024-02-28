import { BacktraceAttachment } from '@backtrace/sdk-core';
import { eventWithTime } from '@rrweb/types';
import { record } from 'rrweb';
import { recordOptions } from 'rrweb/typings/types';

export interface BacktraceSessionRecorderOptions {
    readonly maxEventCount?: number;
    readonly maxTime?: number;
    readonly rrOptions?: recordOptions<Event>;
}

export class BacktraceSessionRecorder implements BacktraceAttachment {
    public readonly type = 'dynamic';
    private _previousEvents?: eventWithTime[] = [];
    private _events?: eventWithTime[] = [];

    private _stop?: () => void;

    constructor(private readonly _options: BacktraceSessionRecorderOptions) {
        this._events = [];
    }

    public name = 'bt-session-replay-0';

    public start() {
        const stop = record({
            ...this._options.rrOptions,
            emit: (event, isCheckout) => {
                if (isCheckout || !this._events) {
                    this._previousEvents = this._events;
                    this._events = [];
                }

                this._events.push(event);
            },
            checkoutEveryNth: this._options.maxEventCount,
            checkoutEveryNms: this._options.maxTime,
        });

        this._stop = stop;
    }

    public stop() {
        if (this._stop) {
            this._stop();
        }
    }

    public get(): string {
        let events = [...(this._events ?? []), ...(this._previousEvents ?? [])];
        if (this._options.maxTime) {
            const cutout = Date.now() - this._options.maxTime;
            events = events.filter((e) => e.timestamp >= cutout);
        }

        return JSON.stringify(events);
    }
}
