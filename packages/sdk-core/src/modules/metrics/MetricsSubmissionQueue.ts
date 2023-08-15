import { Delay } from '../../common/DelayHelper';
import { jsonEscaper } from '../../common/jsonEscaper';
import { TimeHelper } from '../../common/TimeHelper';
import { BacktraceRequestHandler } from '../../model/http';
import { MetricsQueue } from './MetricsQueue';
import { MetricsEvent } from './model/MetricsEvent';

export class MetricsSubmissionQueue<T extends MetricsEvent> implements MetricsQueue<T> {
    public get total() {
        return this._events.length;
    }

    public get submissionUrl() {
        return this._submissionUrl;
    }

    public readonly DELAY_BETWEEN_REQUESTS = TimeHelper.convertSecondsToMilliseconds(10);

    private readonly _events: T[] = [];
    private _numberOfDroppedRequests = 0;

    private readonly MAXIMUM_NUMBER_OF_ATTEMPTS = 3;

    constructor(
        private readonly _submissionUrl: string,
        private readonly _eventName: string,
        private readonly _requestHandler: BacktraceRequestHandler,
        private readonly _metricMetadata: Record<string, unknown>,
        public readonly maximumEvents: number = 50,
    ) {}

    public add(event: T) {
        this._events.push(event);
        if (this.reachedLimit()) {
            this.send();
        }
    }

    public async send() {
        const eventsToProcess = this._events.splice(0);
        return await this.submit(eventsToProcess);
    }

    private async submit(events: T[]) {
        for (let attempts = 0; attempts < this.MAXIMUM_NUMBER_OF_ATTEMPTS; attempts++) {
            const response = await this._requestHandler.post(
                this._submissionUrl,
                JSON.stringify(
                    {
                        ...this._metricMetadata,
                        [this._eventName]: events,
                        metadata: {
                            dropped_events: this._numberOfDroppedRequests,
                        },
                    },
                    jsonEscaper(),
                ),
            );
            if (response.status === 'Ok') {
                this._numberOfDroppedRequests = 0;
                return;
            }

            this._numberOfDroppedRequests++;
            await Delay.wait(2 ** attempts * this.DELAY_BETWEEN_REQUESTS);
        }
        // if the code reached this line, it means, we couldn't send data to server
        // we need to try to return events to the queue and try to send it once again later.
        this.returnEventsIfPossible(events);
    }

    private returnEventsIfPossible(events: T[]) {
        if (this.maximumEvents < this._events.length + events.length) {
            return;
        }

        // push events to the beginning of the queue
        this._events.unshift(...events);
    }

    private reachedLimit() {
        return this.maximumEvents === this._events.length && this.maximumEvents !== 0;
    }
}
