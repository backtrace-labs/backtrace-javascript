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

export interface BacktraceProguardConfiguration {
    /**
     * Marks reports built from Java stack traces (unhandled Java exceptions, ANRs) for ProGuard/R8
     * deobfuscation by Backtrace. Android only. By default the value is set to false.
     */
    enable?: boolean;

    /**
     * Identifier of the ProGuard/R8 mapping file uploaded to Backtrace for this build. Sent as the
     * `symbolication_id` attribute on every Android report. When not set, add that attribute yourself.
     */
    symbolicationId?: string;
}

export interface BacktraceConfiguration extends SdkConfiguration {
    /**
     * Application Not Responding settings
     */
    anr?: BacktraceAnrConfiguration;

    /**
     * ProGuard/R8 deobfuscation settings
     */
    proguard?: BacktraceProguardConfiguration;
}
