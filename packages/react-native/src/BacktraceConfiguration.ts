import {
    type DisabledBacktraceDatabaseConfiguration as CoreDisabledBacktraceDatabaseConfiguration,
    type EnabledBacktraceDatabaseConfiguration as CoreEnabledBacktraceDatabaseConfiguration,
    type BacktraceConfiguration as SdkConfiguration,
} from '@backtrace/sdk-core';

export interface EnabledBacktraceDatabaseConfiguration extends CoreEnabledBacktraceDatabaseConfiguration {
    /**
     * Path where the SDK can store data.
     */
    path: string;
    /**
     * Determine if the directory should be auto created by the SDK.
     * @default true
     */
    createDatabaseDirectory?: boolean;
}

export interface DisabledBacktraceDatabaseConfiguration
    extends CoreDisabledBacktraceDatabaseConfiguration,
        Omit<Partial<EnabledBacktraceDatabaseConfiguration>, 'enable'> {}

export type BacktraceDatabaseConfiguration =
    | EnabledBacktraceDatabaseConfiguration
    | DisabledBacktraceDatabaseConfiguration;

export interface BacktraceConfiguration extends Omit<SdkConfiguration, 'database'> {
    database: BacktraceDatabaseConfiguration;
}
