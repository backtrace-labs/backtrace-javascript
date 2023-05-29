export enum DeduplicationStrategy {
    None = 0,
    Callstack = 1 << 0,
    Classifier = 1 << 1,
    Message = 1 << 2,
    All = ~(~0 << 4),
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
     * By default = true.
     */
    createDatabaseDirectory?: boolean;

    /**
     * Aggregates duplicated reports. The available options are:
     * None: Duplicated reports are not aggregated.
     * Callstack: Aggregates based on the current stack trace.
     * Classifier: Aggregates by stack trace and exception type.
     * Message: Aggregates by stack trace and exception message.
     * All: Aggregates by faulting callstack, exception type, and exception message.
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
     * The maximum database size in MB. When the limit is reached, the oldest reports are removed.
     * If the value is equal to '0', then no limit is set.
     * The default value is 0 (unlimited)
     */
    maximumDatabaseSizeInMb?: number;
    /**
     * The amount of time (in seconds) to wait between retries if the database is unable to send a report.
     * The default value is 60
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
