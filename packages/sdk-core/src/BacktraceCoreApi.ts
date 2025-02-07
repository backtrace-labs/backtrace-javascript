import { BacktraceAttachment } from './model/attachment/BacktraceAttachment.js';
import {
    BacktraceAttachmentResponse,
    BacktraceReportSubmissionResult,
    BacktraceRequestHandler,
    BacktraceSubmitBody,
    BacktraceSubmitResponse,
    RequestBacktraceReportSubmission,
} from './model/http/index.js';
import {
    BacktraceSubmitSummedMetricsBody,
    BacktraceSubmitUniqueMetricsBody,
} from './model/http/model/metric/request/BacktraceSubmitMetricsBody.js';
import { MetricsUrlInformation } from './modules/metrics/MetricsUrlInformation.js';

export interface BacktraceCoreApiOptions {
    readonly url: string;
    readonly token?: string;

    readonly metrics?: {
        readonly url?: string;
    };

    readonly requestBacktraceReportSubmission?: RequestBacktraceReportSubmission;
}

export class BacktraceCoreApi {
    private readonly _summedMetricsSubmissionUrl?: string;
    private readonly _uniqueMetricsSubmissionUrl?: string;

    private readonly _requestBacktraceReportSubmission: RequestBacktraceReportSubmission;

    constructor(
        options: BacktraceCoreApiOptions,
        private readonly _requestHandler: BacktraceRequestHandler,
    ) {
        this._summedMetricsSubmissionUrl = MetricsUrlInformation.generateSummedEventsUrl(
            options.metrics?.url ?? 'https://events.backtrace.io',
            options.url,
            options.token,
        );

        this._uniqueMetricsSubmissionUrl = MetricsUrlInformation.generateUniqueEventsUrl(
            options.metrics?.url ?? 'https://events.backtrace.io',
            options.url,
            options.token,
        );

        this._requestBacktraceReportSubmission =
            options.requestBacktraceReportSubmission ??
            new RequestBacktraceReportSubmission(
                {
                    url: options.url,
                },
                this._requestHandler,
            );
    }

    public sendReport(
        data: BacktraceSubmitBody,
        attachments: BacktraceAttachment[],
        abortSignal?: AbortSignal,
    ): Promise<BacktraceReportSubmissionResult<BacktraceSubmitResponse>> {
        return this._requestBacktraceReportSubmission.send(data, attachments, abortSignal);
    }

    public sendAttachment(
        rxid: string,
        attachment: BacktraceAttachment,
        abortSignal?: AbortSignal,
    ): Promise<BacktraceReportSubmissionResult<BacktraceAttachmentResponse>> {
        return this._requestBacktraceReportSubmission.sendAttachment(rxid, attachment, abortSignal);
    }

    public sendUniqueMetrics(
        metrics: BacktraceSubmitUniqueMetricsBody,
        abortSignal?: AbortSignal,
    ): Promise<BacktraceReportSubmissionResult<unknown>> {
        if (!this._uniqueMetricsSubmissionUrl) {
            throw new Error('Unique metrics URL is not available.');
        }

        return this._requestHandler.post(this._uniqueMetricsSubmissionUrl, JSON.stringify(metrics), abortSignal);
    }

    public sendSummedMetrics(
        metrics: BacktraceSubmitSummedMetricsBody,
        abortSignal?: AbortSignal,
    ): Promise<BacktraceReportSubmissionResult<unknown>> {
        if (!this._summedMetricsSubmissionUrl) {
            throw new Error('Summed metrics URL is not available.');
        }

        return this._requestHandler.post(this._summedMetricsSubmissionUrl, JSON.stringify(metrics), abortSignal);
    }
}
