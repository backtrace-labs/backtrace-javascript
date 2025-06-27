export interface EnabledBacktraceDatabaseConfiguration {
    /**
     * Determine if the Database is enabled
     */
    enable: true;

    /**
     * Sends reports to the server based on the retry settings.
     * If the value is set to 'false', you can use the Flush or Send methods as an alternative.
     */
    autoSend?: boolean;

    /**
     * The maximum number of reports stored in the offline database. When the limit is reached,
     * the oldest reports are removed. If the value is equal to '0', then no limit is set.
     * @default 8
     */
    maximumNumberOfRecords?: number;

    /**
     * The maximum number of attachments stored in the offline database. When the limit is reached,
     * the oldest attachments are removed. If the value is equal to '0', then no limit is set.
     * @default 10
     */
    maximumNumberOfAttachmentRecords?: number;

    /**
     * The amount of time (in ms) to wait between retries if the database is unable to send a report.
     * The default value is 60 000
     */
    retryInterval?: number;

    /**
     * The maximum number of retries to attempt if the database is unable to send a report.
     * @default 3
     */
    maximumRetries?: number;

    /**
     * Captures and symbolicates stack traces for native crashes if the runtime supports this.
     * A crash report is generated, stored locally, and uploaded upon next start.
     */
    captureNativeCrashes?: boolean;

    /**
     * Controls how much previous session caches to preserve before sending data from previous sessions.
     * This does not remove unsent reports, only session files, like breadcrumbs stored on disk.
     * @default 1
     */
    maximumOldSessions?: number;
}

export interface DisabledBacktraceDatabaseConfiguration
    extends Omit<Partial<EnabledBacktraceDatabaseConfiguration>, 'enable'> {
    /**
     * Determine if the Database is enable
     */
    enable?: false;
}

export type BacktraceDatabaseConfiguration =
    | EnabledBacktraceDatabaseConfiguration
    | DisabledBacktraceDatabaseConfiguration;
