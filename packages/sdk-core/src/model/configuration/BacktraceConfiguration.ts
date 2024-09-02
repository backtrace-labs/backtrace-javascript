import { BreadcrumbLogLevel, BreadcrumbType } from '../../modules/breadcrumbs/index.js';
import { RawBreadcrumb } from '../../modules/breadcrumbs/model/RawBreadcrumb.js';
import { BacktraceAttachment } from '../attachment/index.js';
import { BacktraceData } from '../data/BacktraceData.js';
import { BacktraceReport } from '../report/BacktraceReport.js';
import { BacktraceDatabaseConfiguration } from './BacktraceDatabaseConfiguration.js';

export interface BacktraceMetricsOptions {
    /**
     * Metrics server hostname. By default the value is set to https://events.backtrace.io.
     */
    metricsSubmissionUrl?: string;
    /**
     * Determines if the metrics support is enabled. By default the value is set to true.
     */
    enable?: boolean;
    /**
     * Indicates how often crash free metrics are sent to Backtrace. The interval is a value in ms.
     * By default, session events are sent on application startup/finish, and every 30 minutes while the application is running.
     * If the value is set to 0. The auto send mode is disabled. In this situation the application needs to maintain send
     * mode manually.
     */
    autoSendInterval?: number;

    /**
     * Indicates how many events the metrics storage can store before auto submission.
     */
    size?: number;
}

export interface BacktraceBreadcrumbsSettings {
    /**
     * Determines if the breadcrumbs support is enabled. By default the value is set to true.
     */
    enable?: boolean;

    /**
     * Specifies which log level severity to include. By default all logs are included.
     */
    logLevel?: BreadcrumbLogLevel;

    /**
     * Specifies which breadcrumb type to include. By default all types are included.
     */
    eventType?: BreadcrumbType;

    /**
     * Specifies maximum number of breadcrumbs stored by the library. By default, only 100 breadcrumbs
     * will be stored.
     */
    maximumBreadcrumbs?: number;

    /**
     * Inspects breadcrumb and allows to modify it. If the undefined value is being
     * returned from the method, no breadcrumb will be added to the breadcrumb storage.
     */
    intercept?: (breadcrumb: RawBreadcrumb) => RawBreadcrumb | undefined;
}

export interface BacktraceConfiguration {
    /**
     * The server address (submission URL) is required to submit exceptions from your project to your Backtrace instance.
     *
     * The Server Address must be in the following format: https://submit.backtrace.io/{subdomain}/{submission-token}/json
     *
     * For users who need to use a direct URL to the Backtrace instance, the server address must be in the following format:
     * https://universe-name.sp.backtrace.io:6098/
     *
     * The direct submission URL requires an optional token to be available.
     */
    url: string;

    /**
     * Determines if unhandled should be captured by the library.
     * By default true.
     */
    captureUnhandledErrors?: boolean;

    /**
     * Determines if unhandled promise rejections should be captured by the library.
     * By default true.
     */
    captureUnhandledPromiseRejections?: boolean;

    /**
     * Submission token - the token is required only if the user uses direct submission URL to Backtrace.
     */
    token?: string;
    timeout?: number;
    ignoreSslCertificate?: boolean;

    /**
     * Triggers an event every time an exception in the managed environment occurs, which allows you to skip the report (by returning a null value)
     * or to modify data that library collected before sending the report. You can use the BeforeSend event to extend attributes or JSON object
     * data based on data the application has at the time of exception.
     */
    beforeSend?: (data: BacktraceData) => BacktraceData | undefined;

    /**
     * If you want to ignore specific types of error reports, we recommend that you use the skipReport callback.
     * By using it, based on the data generated in the report, you can decide to filter the report, or send it to
     * Backtrace.
     */
    skipReport?: (report: BacktraceReport) => boolean;
    /**
     * Limits the number of reports the client will send per minute. If set to '0', there is no limit.
     * If set to a value greater than '0' and the value is reached, the client will not send any reports until the next minute.
     */
    rateLimit?: number;
    /**
     * Attributes are additional metadata that can be attached to error and crash reports. You can use attributes to filter,
     * aggregate, analyze, and debug errors in the Backtrace console.
     */
    userAttributes?: Record<string, unknown> | (() => Record<string, unknown>);
    /**
     * Attachments are additional files/data that can be send with error to Backtrace.
     */
    attachments?: BacktraceAttachment[];

    /**
     * Metrics such as crash free users and crash free sessions
     */
    metrics?: BacktraceMetricsOptions;

    /**
     * Breadcrumbs settings
     */
    breadcrumbs?: BacktraceBreadcrumbsSettings;
    /**
     * Offline database settings
     */
    database?: BacktraceDatabaseConfiguration;
}
