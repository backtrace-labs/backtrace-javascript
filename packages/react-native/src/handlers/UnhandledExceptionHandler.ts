import { BacktraceReport, warnFailure } from '@backtrace/sdk-core';
import { format as prettyFormat } from 'pretty-format';
import { AppState } from 'react-native';
import type { BacktraceClient } from '../BacktraceClient';
import { hermes } from '../common/hermesHelper';
import { CrashReporter } from '../crashReporter/CrashReporter';
import { type ExceptionHandler } from './ExceptionHandler';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const rejectionTracking = require('promise/setimmediate/rejection-tracking') as {
    enable(options: {
        allRejections: boolean;
        onUnhandled: (id: number, rejection?: unknown) => void;
        onHandled: (id: number) => void;
    }): void;
};

type GlobalErrorHandler = ReturnType<typeof ErrorUtils.getGlobalHandler>;

const FATAL_REPORT_TIMEOUT_MS = 5000;

export class UnhandledExceptionHandler implements ExceptionHandler {
    protected enabled = true;

    private _managedClient?: BacktraceClient;
    private _rejectionClient?: BacktraceClient;
    private _installedHandler?: GlobalErrorHandler;
    private _previousHandler?: GlobalErrorHandler;
    private _reportingManagedError = false;
    private _reportingRejection = false;
    private _warning = false;
    private _pendingFatal?: Promise<void>;
    private _escalatedError?: unknown;

    public captureManagedErrors(client: BacktraceClient): void {
        if (!this.enabled || this._installedHandler) {
            return;
        }

        const previousHandler = ErrorUtils.getGlobalHandler();
        this._managedClient = client;

        const installedHandler: GlobalErrorHandler = (error: Error, fatal?: boolean) => {
            if (this._escalatedError !== undefined && error === this._escalatedError) {
                this._escalatedError = undefined;
                throw error;
            }

            const managedClient = this._managedClient;

            if (!this.enabled || !managedClient || this._reportingManagedError) {
                // Disposed and re-entered wrappers still forward.
                // Exceptions from the application's original handler must keep their original behavior.
                previousHandler(error, fatal);
                return;
            }

            let submission: Promise<unknown> | undefined;
            this._reportingManagedError = true;
            try {
                // send() can throw before returning a promise.
                submission = Promise.resolve(
                    managedClient.send(error, {
                        'error.type': 'Unhandled exception',
                        fatal,
                    }),
                ).catch(() => undefined);
            } catch (err) {
                this.warnReportingFailure('failed to report an unhandled error', err);
            } finally {
                this._reportingManagedError = false;
            }

            if (!fatal || !submission) {
                previousHandler(error, fatal);
                return;
            }

            // The previous handler ends the process only in release builds.
            if (__DEV__) {
                previousHandler(error, fatal);
                return;
            }

            if (this.isInBackground()) {
                // JS timers are paused in the background.
                this.markFatalErrorSafely(error);
                previousHandler(error, fatal);
                return;
            }

            // The previous handler ends the process.
            const settled = this.settle(submission, FATAL_REPORT_TIMEOUT_MS);
            this.queueFatalForwarding(() => settled.then(() => this.forwardFatal(previousHandler, error, fatal)));
        };

        try {
            ErrorUtils.setGlobalHandler(installedHandler);
            this._previousHandler = previousHandler;
            this._installedHandler = installedHandler;
        } catch (err) {
            this._managedClient = undefined;
            throw err;
        }
    }

    public captureUnhandledPromiseRejections(client: BacktraceClient): void {
        if (!this.enabled || this._rejectionClient) {
            return;
        }

        this._rejectionClient = client;

        try {
            const hermesInternal = hermes();

            if (hermesInternal?.hasPromise?.() && hermesInternal.enablePromiseRejectionTracker) {
                hermesInternal.enablePromiseRejectionTracker({
                    allRejections: true,
                    onUnhandled: (id, rejection) => this.reportRejection(id, rejection),
                });
                return;
            }

            // Preserve React Native's development warnings when replacing its
            // fallback rejection tracker.
            rejectionTracking.enable({
                allRejections: true,
                onUnhandled: (id, rejection) => {
                    this.reportRejection(id, rejection);
                    this.warnUnhandledRejection(id, rejection);
                },
                onHandled: (id) => {
                    if (__DEV__) {
                        this.warn(
                            `Promise Rejection Handled (id: ${id})\n` +
                                'This means you can ignore any previous messages of the form ' +
                                `"Possible Unhandled Promise Rejection (id: ${id}):"`,
                        );
                    }
                },
            });
        } catch (err) {
            this._rejectionClient = undefined;
            throw err;
        }
    }

    public dispose(): void {
        this.enabled = false;
        this._managedClient = undefined;
        this._rejectionClient = undefined;

        // Another SDK may have wrapped our handler.
        // Only restore a handler we still own, retained wrappers remain forwarding-only after disposal.
        if (
            this._installedHandler &&
            this._previousHandler &&
            ErrorUtils.getGlobalHandler() === this._installedHandler
        ) {
            ErrorUtils.setGlobalHandler(this._previousHandler);
        }

        this._installedHandler = undefined;
        this._previousHandler = undefined;

        // Promise trackers do not expose ownership. Disabling tracking globally
        // could disable a newer tracker installed by another SDK.
    }

    protected markFatalError: (message: string) => void = () => CrashReporter.markFatalError();

    private queueFatalForwarding(forward: () => Promise<void> | void): void {
        const pending = (this._pendingFatal ?? Promise.resolve()).then(forward).then(() => {
            if (this._pendingFatal === pending) {
                this._pendingFatal = undefined;
            }
        });
        this._pendingFatal = pending;
    }

    private forwardFatal(previousHandler: GlobalErrorHandler, error: Error, fatal: boolean): void {
        this.markFatalErrorSafely(error);
        try {
            previousHandler(error, fatal);
        } catch (err) {
            // React Native's native fallback ends the process only for a throw out of the global handler.
            this._escalatedError = err;
            setTimeout(() => {
                throw err;
            }, 0);
        }
    }

    private markFatalErrorSafely(error: unknown): void {
        try {
            this.markFatalError(this.fatalErrorMessage(error));
        } catch (err) {
            this.warnReportingFailure('failed to mark the fatal error for the native handler', err);
        }
    }

    // Mirrors the message React Native builds for the rethrown error.
    private fatalErrorMessage(error: unknown): string {
        if (error instanceof Error) {
            return error.message ? String(error.message) : '';
        }
        return error === undefined ? '' : String(error);
    }

    private isInBackground(): boolean {
        try {
            return AppState.currentState === 'background';
        } catch {
            return false;
        }
    }

    private settle(promise: Promise<unknown>, timeoutMs: number): Promise<void> {
        return new Promise<void>((resolve) => {
            const done = () => {
                clearTimeout(timer);
                subscription?.remove();
                resolve();
            };
            const timer = setTimeout(done, timeoutMs);
            const subscription = this.onBackground(done);
            promise.then(done, done);
        });
    }

    private onBackground(callback: () => void): { remove(): void } | undefined {
        try {
            return AppState.addEventListener('change', (state) => {
                if (state === 'background') {
                    callback();
                }
            });
        } catch {
            return undefined;
        }
    }

    private reportRejection(id: number, rejection: unknown = 'Unknown'): void {
        const client = this._rejectionClient;
        if (!this.enabled || !client || this._reportingRejection) {
            return;
        }

        this._reportingRejection = true;
        try {
            const data =
                rejection instanceof Error || typeof rejection === 'string'
                    ? rejection
                    : this.describeRejection(rejection);
            const report = new BacktraceReport(
                data,
                {
                    'error.type': 'Unhandled rejection',
                    unhandledPromiseRejectionId: id,
                },
                [],
                {
                    classifiers: ['UnhandledPromiseRejection'],
                    // Hide this helper and the tracker callback for synthesized stacks.
                    skipFrames: rejection instanceof Error ? 0 : 2,
                },
            );

            void Promise.resolve(client.send(report)).catch(() => undefined);
        } catch (err) {
            this.warnReportingFailure('failed to report an unhandled rejection', err);
        } finally {
            this._reportingRejection = false;
        }
    }

    private describeRejection(rejection: unknown): string {
        try {
            return typeof rejection === 'string' ? rejection : prettyFormat(rejection);
        } catch {
            return '<unformattable rejection>';
        }
    }

    private warnUnhandledRejection(id: number, rejection: unknown = 'Unknown'): void {
        if (!__DEV__) {
            return;
        }

        try {
            const message =
                rejection instanceof Error
                    ? `${Error.prototype.toString.call(rejection)}\n${rejection.stack ?? ''}`
                    : this.describeRejection(rejection);
            this.warn(`Possible Unhandled Promise Rejection (id: ${id}):\n${message}`);
        } catch {
            // Error objects can expose getters that throw.
        }
    }

    private warnReportingFailure(message: string, error: unknown): void {
        if (this._warning) {
            return;
        }
        this._warning = true;
        try {
            warnFailure(message, error);
        } catch {
            // Logging failures must not replace the application's error.
        } finally {
            this._warning = false;
        }
    }

    private warn(message: string): void {
        if (this._warning) {
            return;
        }
        this._warning = true;
        try {
            console.warn(message);
        } catch {
            // Console can be instrumented by the application or another SDK.
        } finally {
            this._warning = false;
        }
    }
}
