export enum DeduplicationStrategy {
    /**
     * Duplicated reports are not aggregated
     */
    None = 0,
    /**
     * Aggregates based on the current stack trace
     */
    Callstack = 1 << 0,
    /**
     * Aggregates by stack trace and exception type
     */
    Classifier = 1 << 1,
    /**
     * Aggregates by stack trace and exception message
     */
    Message = 1 << 2,
    /**
     * Aggregates by faulting callstack, exception type, and exception message
     */
    All = ~(~0 << 4) - 1,
}
export interface EnabledBacktraceDatabaseConfiguration {
    /**
     * Determine if the Database is enabled
     */
    enabled: true;
    /**
     * Path where the SDK can store data.
     */
    path: string;
    /**
     * Determine if the directory should be auto created by the SDK.
     * By default true.
     */
    createDatabaseDirectory?: boolean;

    /**
     * Duplicated reports aggregration settings. If defined, the same reports can be combined
     * together.
     */
    deduplicationStrategy?: DeduplicationStrategy;

    /**
     * Sends reports to the server based on the retry settings.
     * If the value is set to 'false', you can use the Flush or Send methods as an alternative.
     */
    autoSend?: boolean;

    /**
     * The maximum number of reports stored in the offline database. When the limit is reached,
     * the oldest reports are removed. If the value is equal to '0', then no limit is set.
     * The default value is 8.
     */
    maximumNumberOfRecords?: number;

    /**
     * The amount of time (in ms) to wait between retries if the database is unable to send a report.
     * The default value is 60 000
     */
    retryInterval?: number;

    /**
     * The maximum number of retries to attempt if the database is unable to send a report.
     * The default value is 3
     */
    maximumRetries?: number;
}

export interface DisabledBacktraceDatabaseConfiguration
    extends Omit<Partial<EnabledBacktraceDatabaseConfiguration>, 'enabled'> {
    /**
     * Determine if the Database is enabled
     */
    enabled?: false;
}

export type BacktraceDatabaseConfiguration =
    | EnabledBacktraceDatabaseConfiguration
    | DisabledBacktraceDatabaseConfiguration;
