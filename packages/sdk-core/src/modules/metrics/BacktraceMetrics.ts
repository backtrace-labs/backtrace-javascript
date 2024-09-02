import { createAbortController } from '../../common/AbortController.js';
import { AbortError } from '../../common/AbortError.js';
import { TimeHelper } from '../../common/TimeHelper.js';
import { BacktraceMetricsOptions } from '../../model/configuration/BacktraceConfiguration.js';
import { AttributeType } from '../../model/data/BacktraceData.js';
import { BacktraceModule } from '../BacktraceModule.js';
import { AttributeManager } from '../attribute/AttributeManager.js';
import { ReportDataBuilder } from '../attribute/ReportDataBuilder.js';
import { BacktraceSessionProvider } from './BacktraceSessionProvider.js';
import { MetricsQueue } from './MetricsQueue.js';
import { SummedEvent } from './model/SummedEvent.js';
import { UniqueEvent } from './model/UniqueEvent.js';

export class BacktraceMetrics implements BacktraceModule {
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

    public readonly metricsHost: string;
    private readonly _updateInterval: number;

    private _updateIntervalId?: ReturnType<typeof setTimeout>;
    private readonly _abortController: AbortController;

    constructor(
        private readonly _options: BacktraceMetricsOptions,
        private readonly _sessionProvider: BacktraceSessionProvider,
        private readonly _attributeManager: AttributeManager,
        private readonly _summedEventsSubmissionQueue: MetricsQueue<SummedEvent>,
        private readonly _uniqueEventsSubmissionQueue: MetricsQueue<UniqueEvent>,
    ) {
        this.metricsHost = this._options.metricsSubmissionUrl ?? this.DEFAULT_SERVER_URL;
        this._updateInterval = this._options.autoSendInterval ?? this.DEFAULT_UPDATE_INTERVAL;

        this._abortController = createAbortController();
    }

    /**
     * Starts metrics submission.
     */
    public initialize() {
        if (!this._sessionProvider.newSession) {
            return;
        }

        this.addSummedEvent('Application Launches');
        this.handleAbort(() => this.send(this._abortController.signal));

        if (this._updateInterval === 0) {
            return;
        }
        this._updateIntervalId = setInterval(() => {
            this.handleAbort(() => this.send(this._abortController.signal));
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
    public async send(abortSignal?: AbortSignal) {
        if (!this._sessionProvider.shouldSend()) {
            return false;
        }
        await Promise.all([this.sendUniqueEvent(abortSignal), this._summedEventsSubmissionQueue.send(abortSignal)]);
        this._sessionProvider.afterMetricsSubmission();
        return true;
    }

    /**
     * Cleans up metrics interface.
     */
    public dispose() {
        this._abortController.abort();

        if (this._updateIntervalId) {
            clearInterval(this._updateIntervalId);
        }

        this._uniqueEventsSubmissionQueue.dispose && this._uniqueEventsSubmissionQueue.dispose();
        this._summedEventsSubmissionQueue.dispose && this._summedEventsSubmissionQueue.dispose();
    }

    private async sendUniqueEvent(abortSignal?: AbortSignal) {
        // always add the same unique event before send.
        const { attributes } = this._attributeManager.get();
        this._uniqueEventsSubmissionQueue.add(new UniqueEvent(this.convertAttributes(attributes)));
        await this._uniqueEventsSubmissionQueue.send(abortSignal);
    }

    /**
     * Event aggregators expecting to retrieve attributes in a string format. They also
     * don't expect to retrieve null/undefined as attribute values.
     */
    private convertAttributes(attributes: Record<string, AttributeType>) {
        return Object.keys(attributes)
            .filter((n) => attributes[n] != null)
            .reduce(
                (acc, n) => {
                    acc[n] = attributes[n]?.toString();
                    return acc;
                },
                {} as Record<string, AttributeType>,
            );
    }

    private async handleAbort(fn: () => Promise<unknown>): Promise<boolean> {
        try {
            await fn();
            return true;
        } catch (err) {
            if (err instanceof AbortError) {
                return false;
            }
            throw err;
        }
    }
}
