import {
    BacktraceAttachment,
    BacktraceConfiguration as CoreConfiguration,
    DisabledBacktraceDatabaseConfiguration as CoreDisabledBacktraceDatabaseConfiguration,
    EnabledBacktraceDatabaseConfiguration as CoreEnabledBacktraceDatabaseConfiguration,
} from '@backtrace/sdk-core';
import { Readable } from 'stream';

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

export interface BacktraceSetupConfiguration extends Omit<CoreConfiguration, 'attachments' | 'database'> {
    attachments?: Array<BacktraceAttachment<Buffer | Readable | string | Uint8Array> | string>;
    database?: BacktraceDatabaseConfiguration;
}

export interface BacktraceConfiguration extends Omit<CoreConfiguration, 'attachments' | 'database'> {
    attachments?: BacktraceAttachment<Buffer | Readable | string | Uint8Array>[];
    database?: BacktraceDatabaseConfiguration;
}
