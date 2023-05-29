import { BacktraceAttachment } from '../report/BacktraceAttachment';
import { BacktraceDatabaseConfiguration } from './BacktraceDatabaseConfiguration';

// Submission information
export interface BacktraceBasicSubmissionInformation {
    /**
     * The server address (submission URL) is required to submit exceptions from your project to your Backtrace instance.
     *
     * The Server Address must be in the following format: https://submit.backtrace.io/{subdomain}/{submission-token}/json.
     */
    url: string;
    timeout?: number;
    ignoreSslCertificate?: boolean;
}
// Legacy submission information
export interface BacktraceLegacySubmitInformation extends BacktraceBasicSubmissionInformation {
    token: string;
}
export type BacktraceSubmissionInformation = BacktraceBasicSubmissionInformation | BacktraceLegacySubmitInformation;

export interface BacktraceMetricsSupport {
    metricsSubmissionUrl?: string;
    enable: boolean;
    ignoreSslCertificate?: boolean;
    /**
     * Indicates how often crash free metrics are sent to Backtrace.
     * By default, session events are sent on application startup/finish, and every 30 minutes while the game is running.
     */
    autoSendInterval?: number;
}

export interface BasicBacktraceClientSettings extends BacktraceBasicSubmissionInformation {
    /**
     * Limits the number of reports the client will send per minute. If set to '0', there is no limit.
     * If set to a value greater than '0' and the value is reached, the client will not send any reports until the next minute.
     */
    rateLimit: number;
    /**
     * Attributes are additional metadata that can be attached to error and crash reports. You can use attributes to filter,
     * aggregate, analyze, and debug errors in the Backtrace console.
     */
    userAttributes?: Record<string, unknown>;
    /**
     * Attachments are additional files/data that can be send with error to Backtrace.
     */
    attachments?: BacktraceAttachment[];

    /**
     * Metrics such as crash free users and crash free sessions
     */
    metrics?: BacktraceMetricsSupport;
}

export type BacktraceConfiguration = BasicBacktraceClientSettings & BacktraceDatabaseConfiguration;
