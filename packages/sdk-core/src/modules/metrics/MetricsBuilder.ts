import { TimeHelper } from '../../common/TimeHelper';
import { BacktraceConfiguration, BacktraceMetricsOptions } from '../../model/configuration/BacktraceConfiguration';
import { BacktraceRequestHandler } from '../../model/http';
import { AttributeManager } from '../attribute/AttributeManager';
import { BacktraceMetrics } from './BacktraceMetrics';
import { BacktraceSessionProvider } from './BacktraceSessionProvider';
import { MetricsQueue } from './MetricsQueue';
import { MetricsSubmissionQueue } from './MetricsSubmissionQueue';
import { MetricsUrlInformation } from './MetricsUrlInformation';
import { SummedEvent } from './model/SummedEvent';
import { UniqueEvent } from './model/UniqueEvent';

interface ApplicationInfo {
    application: string;
    applicationVersion: string;
}
export class MetricsBuilder {
    /**
     * Default metrics submission interval. The variable defines how often metrics will be sent to metrics system
     * By default 30 mins.
     */
    public readonly DEFAULT_UPDATE_INTERVAL = TimeHelper.convertSecondsToMilliseconds(30 * 60);

    private readonly APPLICATION_VERSION_ATTRIBUTE = 'application.version';
    private readonly APPLICATION_ATTRIBUTE = 'application';
    constructor(
        private readonly _options: BacktraceConfiguration,
        private readonly _sessionProvider: BacktraceSessionProvider,
        private readonly _attributeManager: AttributeManager,
        private readonly _requestHandler: BacktraceRequestHandler,
    ) {}

    public build(
        uniqueEventsSubmissionQueue?: MetricsQueue<UniqueEvent>,
        summedEventsSubmissionQueue?: MetricsQueue<UniqueEvent>,
    ): BacktraceMetrics | undefined {
        const metricsOptions = {
            ...this.optionsWithDefaults(),
            ...(this._options.metrics ?? {}),
        };
        if (!metricsOptions.enable) {
            return undefined;
        }
        const applicationInfo = this.verifyAttributeSetup();
        if (!applicationInfo) {
            return undefined;
        }

        uniqueEventsSubmissionQueue =
            uniqueEventsSubmissionQueue ??
            this.createUniqueEventSubmissionQueue(metricsOptions.metricsSubmissionUrl as string, applicationInfo);
        if (!uniqueEventsSubmissionQueue) {
            return undefined;
        }

        summedEventsSubmissionQueue =
            summedEventsSubmissionQueue ??
            this.createSummedEventSubmissionQueue(metricsOptions.metricsSubmissionUrl as string, applicationInfo);
        if (!summedEventsSubmissionQueue) {
            return undefined;
        }

        return new BacktraceMetrics(
            metricsOptions,
            this._sessionProvider,
            this._attributeManager,
            summedEventsSubmissionQueue,
            uniqueEventsSubmissionQueue,
        );
    }

    private verifyAttributeSetup(): ApplicationInfo | undefined {
        const { attributes } = this._attributeManager.get();
        const application = attributes[this.APPLICATION_ATTRIBUTE] as string;
        const applicationVersion = attributes[this.APPLICATION_VERSION_ATTRIBUTE] as string;
        if (!application || !applicationVersion) {
            return undefined;
        }

        return { application, applicationVersion };
    }

    private createUniqueEventSubmissionQueue(metricsHost: string, applicationInfo: ApplicationInfo) {
        const uniqueEventsSubmissionUrl = MetricsUrlInformation.generateUniqueEventsUrl(
            metricsHost,
            this._options.url,
            this._options.token,
        );

        if (!uniqueEventsSubmissionUrl) {
            return undefined;
        }

        return new MetricsSubmissionQueue<UniqueEvent>(
            uniqueEventsSubmissionUrl,
            'unique_events',
            this._requestHandler,
            {
                [this.APPLICATION_ATTRIBUTE]: applicationInfo.application,
                appversion: applicationInfo.applicationVersion,
            },
            this._options?.metrics?.size,
        );
    }

    private createSummedEventSubmissionQueue(metricsHost: string, applicationInfo: ApplicationInfo) {
        const summedEventsSubmissionUrl = MetricsUrlInformation.generateSummedEventsUrl(
            metricsHost,
            this._options.url,
            this._options.token,
        );

        if (!summedEventsSubmissionUrl) {
            return undefined;
        }

        return new MetricsSubmissionQueue<SummedEvent>(
            summedEventsSubmissionUrl,
            'summed_events',
            this._requestHandler,
            {
                [this.APPLICATION_ATTRIBUTE]: applicationInfo.application,
                appversion: applicationInfo.applicationVersion,
            },
            this._options?.metrics?.size,
        );
    }

    private optionsWithDefaults(): BacktraceMetricsOptions {
        return {
            enable: true,
            autoSendInterval: this.DEFAULT_UPDATE_INTERVAL,
            metricsSubmissionUrl: 'https://events.backtrace.io',
            size: 50,
        };
    }
}
