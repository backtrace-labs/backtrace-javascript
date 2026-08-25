import { type BacktraceConfiguration as SdkConfiguration } from '@backtrace/sdk-core';

export type BacktraceAnrType = 'threshold' | 'applicationExit';

export interface BacktraceAnrConfiguration {
    /**
     * Determines if Application Not Responding detection is enabled. Android only.
     * By default the value is set to false.
     */
    enable?: boolean;

    /**
     * Detection mechanism. `threshold` watches the main thread and reports as soon as it is
     * blocked, on any Android version. `applicationExit` reports ANRs the system recorded,
     * on the next application start, and requires API 30 or above.
     * By default the value is set to `threshold`.
     */
    type?: BacktraceAnrType;

    /**
     * Time in milliseconds the main thread must be blocked before an ANR is reported.
     * Applies to the `threshold` type only. By default the value is set to 5000.
     */
    timeout?: number;

    /**
     * When true, detection is disabled while a debugger is attached.
     * Applies to the `threshold` type only. By default the value is set to false.
     */
    debug?: boolean;
}

export interface BacktraceConfiguration extends SdkConfiguration {
    /**
     * Application Not Responding settings
     */
    anr?: BacktraceAnrConfiguration;
}
