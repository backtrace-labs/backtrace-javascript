import { TimeHelper } from '../../common/TimeHelper';
import { BacktraceMetricsOptions } from '../../model/configuration/BacktraceConfiguration';
import { AttributeType } from '../../model/data/BacktraceData';
import { AttributeManager } from '../attribute/AttributeManager';
import { ReportDataBuilder } from '../attribute/ReportDataBuilder';
import { BacktraceSessionProvider } from './BacktraceSessionProvider';
import { MetricsQueue } from './MetricsQueue';
import { SummedEvent } from './model/SummedEvent';
import { UniqueEvent } from './model/UniqueEvent';

export class BacktraceMetrics {
    /**
     * Returns current session id.
     */
    public get sessionId() {
        return this._sessionProvider.sessionId;
    }

    /**
     * Default metrics submission interval. The variable defines how often metrics will be sent to metrics system.
     */
    public readonly DEFAULT_UPDATE_INTERVAL = TimeHelper.convertSecondsToMilliseconds(30 * 60);
    public readonly DEFAULT_SERVER_URL = 'https://events.backtrace.io';

    public readonly metricsHost: string = this._options.metricsSubmissionUrl ?? this.DEFAULT_SERVER_URL;
    private readonly _updateInterval: number = this._options.autoSendInterval ?? this.DEFAULT_UPDATE_INTERVAL;

    private _updateIntervalId?: ReturnType<typeof setTimeout>;

    constructor(
        private readonly _options: BacktraceMetricsOptions,
        private readonly _sessionProvider: BacktraceSessionProvider,
        private readonly _attributeManager: AttributeManager,
        private readonly _summedEventsSubmissionQueue: MetricsQueue<SummedEvent>,
        private readonly _uniqueEventsSubmissionQueue: MetricsQueue<UniqueEvent>,
    ) {}

    /**
     * Starts metrics submission.
     */
    public start() {
        if (!this._sessionProvider.newSession) {
            return;
        }

        this.addSummedEvent('Application Launches');
        this.send();

        if (this._updateInterval === 0) {
            return;
        }
        this._updateIntervalId = setInterval(() => {
            this.send();
        }, this._updateInterval);
    }

    /**
     * Returns total number of events in the submission queue.
     */
    public count() {
        return this._summedEventsSubmissionQueue?.total ?? 0 + this._uniqueEventsSubmissionQueue?.total ?? 0;
    }

    /**
     * Add summed event to next Backtrace Metrics request.
     * @param metricName Summed event name.
     * @param eventAttributes event attributes.
     */
    public addSummedEvent(metricName: string, eventAttributes: Record<string, AttributeType> = {}): boolean {
        if (!metricName) {
            return false;
        }
        const attributes = this.convertAttributes({
            ...this._attributeManager.get().attributes,
            ...ReportDataBuilder.build(eventAttributes ?? {}).attributes,
        });

        this._summedEventsSubmissionQueue.add(new SummedEvent(metricName, attributes));

        return true;
    }

    /**
     * Sends event to the metrics system.
     */
    public send() {
        if (!this._sessionProvider.shouldSend()) {
            return false;
        }
        this.sendUniqueEvent();
        this._summedEventsSubmissionQueue.send();
        this._sessionProvider.afterMetricsSubmission();
        return true;
    }

    /**
     * Cleans up metrics interface.
     */
    public dispose() {
        if (this._updateIntervalId) {
            clearInterval(this._updateIntervalId);
        }
    }

    private sendUniqueEvent() {
        // always add the same unique event before send.
        const { attributes } = this._attributeManager.get();
        this._uniqueEventsSubmissionQueue.add(new UniqueEvent(this.convertAttributes(attributes)));
        this._uniqueEventsSubmissionQueue.send();
    }

    /**
     * Event aggregators expecting to retrieve attributes in a string format. They also
     * don't expect to retrieve null/undefined as attribute values.
     */
    private convertAttributes(attributes: Record<string, AttributeType>) {
        return Object.keys(attributes)
            .filter((n) => attributes[n] != null)
            .reduce((acc, n) => {
                acc[n] = attributes[n]?.toString();
                return acc;
            }, {} as Record<string, AttributeType>);
    }
}
