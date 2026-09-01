import { type BacktraceConfiguration as SdkConfiguration } from '@backtrace/sdk-core';

export enum BacktraceAnrType {
    Threshold = 'threshold',
    ApplicationExit = 'applicationExit',
}

export interface BacktraceAnrConfiguration {
    /**
     * Determines if Application Not Responding detection is enabled. Android only.
     * By default the value is set to false.
     */
    enable?: boolean;

    /**
     * Detection mechanism. `Threshold` watches the main thread and reports as soon as it is
     * blocked, on all supported Android versions. `ApplicationExit` reports ANRs the system recorded,
     * on the next application start, and requires API 30 or above.
     * By default the value is set to `Threshold`.
     */
    type?: BacktraceAnrType;

    /**
     * Time in milliseconds the main thread must be blocked before an ANR is reported.
     * Applies to the `Threshold` type only. By default the value is set to 5000.
     */
    timeout?: number;

    /**
     * When true, detection is disabled while a debugger is attached.
     * Applies to the `Threshold` type only. By default the value is set to false.
     */
    disableWhenDebuggerAttached?: boolean;
}

export interface BacktraceConfiguration extends SdkConfiguration {
    /**
     * Application Not Responding settings
     */
    anr?: BacktraceAnrConfiguration;
}
