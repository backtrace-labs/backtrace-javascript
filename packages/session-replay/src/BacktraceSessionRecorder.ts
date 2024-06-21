import { BacktraceAttachment, OverwritingArray } from '@backtrace/sdk-core';
import { eventWithTime } from '@rrweb/types';
import { record } from 'rrweb';
import { BacktraceSessionRecorderOptions } from './options';

export class BacktraceSessionRecorder implements BacktraceAttachment {
    public readonly name = 'bt-session-replay-0';
    public readonly type = 'dynamic';

    private readonly _maxEventCount?: number;
    private readonly _maxTime?: number;

    private readonly _previousEvents: OverwritingArray<eventWithTime>;
    private _events: eventWithTime[] = [];

    private _stop?: () => void;

    constructor(private readonly _options: BacktraceSessionRecorderOptions) {
        this._events = [];
        this._maxEventCount = !_options.disableMaxEventCount ? _options.maxEventCount ?? 100 : undefined;
        this._maxTime = !_options.disableMaxTime ? _options.maxTime : undefined;
        this._previousEvents = new OverwritingArray<eventWithTime>(this._maxEventCount ?? 100);
    }

    public start() {
        this._stop = record({
            ...this._options.advancedOptions,
            sampling: {
                mousemove: this._options.sampling?.mousemove,
                mouseInteraction: this._options.sampling?.mouseInteraction,
                input: this._options.sampling?.input,
                media: this._options.sampling?.media,
                scroll: this._options.sampling?.scroll,
                ...this._options.advancedOptions,
            },
            emit: (event, isCheckout) => this.onEmit(event, isCheckout),
            checkoutEveryNth: this._maxEventCount && Math.ceil(this._maxEventCount / 2),
            checkoutEveryNms: this._maxTime && Math.ceil(this._maxTime / 2),
        });
    }

    public stop() {
        if (this._stop) {
            this._stop();
        }
    }

    public get(): string {
        const events = this.getEvents();
        return JSON.stringify(events);
    }

    private onEmit(event: eventWithTime, isCheckout?: boolean) {
        if (isCheckout || !this._events) {
            if (this._events) {
                for (const event of this._events) {
                    this._previousEvents.add(event);
                }
            }

            this._events = [];
        }

        if (this._options.privacy?.inspect) {
            const inspected = this._options.privacy.inspect(event);
            if (!inspected) {
                return;
            }
            event = inspected;
        }

        this._events.push(event);

        if (this._options.advancedOptions?.emit) {
            this._options.advancedOptions.emit(event as never, isCheckout);
        }
    }

    private getEvents() {
        // We want to always send maxCount events
        // We take all events from main events array, and skip first `toSkip` elements
        // to fill up to maxCount.

        const maxCount = this._maxEventCount ?? Infinity;
        const eventCount = this._events?.length ?? 0;
        const allPreviousEvents = [...this._previousEvents];
        const toSkip = Math.max(0, eventCount + allPreviousEvents.length - maxCount);
        const previousEvents = allPreviousEvents.slice(toSkip);
        return [...this._events, ...previousEvents];
    }
}
