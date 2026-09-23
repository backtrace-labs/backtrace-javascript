import { BacktraceReport, warnFailure } from '@backtrace/sdk-core';
import { BacktraceClient } from '../BacktraceClient';
import { hermes } from '../common/hermesHelper';
import { CrashReporter } from '../crashReporter/CrashReporter';
import { type ExceptionHandler } from './ExceptionHandler';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const rejectionTracking = require('promise/setimmediate/rejection-tracking');

function getPrettyFormat() {
    try {
        return require('pretty-format');
    } catch {
        return undefined;
    }
}

const cachedPrettyFormat = getPrettyFormat();

export class UnhandledExceptionHandler implements ExceptionHandler {
    protected enabled = true;
    public captureManagedErrors(client: BacktraceClient) {
        const globalErrorHandler = ErrorUtils.getGlobalHandler();
        ErrorUtils.setGlobalHandler((error: Error, fatal?: boolean) => {
            // The app's own handler always runs, also after dispose.
            try {
                if (this.enabled) {
                    client.send(error, {
                        'error.type': 'Unhandled exception',
                        fatal,
                    });
                    // iOS: RCTFatal turns a fatal into a native crash the reporter would double-report.
                    if (fatal) {
                        CrashReporter.markFatalError();
                    }
                }
            } catch (err) {
                warnFailure('failed to report an unhandled error', err);
            } finally {
                globalErrorHandler(error, fatal);
            }
        });
    }

    public captureUnhandledPromiseRejections(client: BacktraceClient) {
        const hermesInternal = hermes();

        if (hermesInternal?.hasPromise?.() && hermesInternal?.enablePromiseRejectionTracker) {
            hermesInternal.enablePromiseRejectionTracker({
                allRejections: true,
                onUnhandled: (id: number, rejection: Error | string = 'Unknown') => {
                    if (!this.enabled) {
                        return;
                    }
                    this.reportRejection(client, id, rejection);
                },
            });
        } else {
            // This is the same unhandled exception handler that exists in the react-native source code.
            // The only difference is to make sure we do not execute it in the dev mode (react-native checks it earlier)
            // and backtrace error reporting function
            // refs: https://github.com/facebook/react-native/blob/a59b947a1e077d1c3f0d36926d374db5fe7d3291/packages/react-native/Libraries/promiseRejectionTrackingOptions.js#L38
            rejectionTracking.enable({
                allRejections: true,
                onUnhandled: (id: number, rejection: Error) => {
                    if (this.enabled) {
                        this.reportRejection(client, id, rejection);
                    }
                    if (!__DEV__) {
                        return;
                    }
                    let message: string;
                    let stack: string | undefined;

                    const stringValue = Object.prototype.toString.call(rejection);
                    if (stringValue === '[object Error]') {
                        message = Error.prototype.toString.call(rejection);
                        stack = rejection.stack as string;
                    } else {
                        message = cachedPrettyFormat
                            ? cachedPrettyFormat(rejection)
                            : typeof rejection === 'string'
                              ? rejection
                              : JSON.stringify({ ...rejection });
                    }

                    const warning =
                        `Possible Unhandled Promise Rejection (id: ${id}):\n` +
                        `${message ?? ''}\n` +
                        (stack == null ? '' : stack);
                    console.warn(warning);
                },
                onHandled: (id: number) => {
                    if (!__DEV__) {
                        return;
                    }
                    const warning =
                        `Promise Rejection Handled (id: ${id})\n` +
                        'This means you can ignore any previous messages of the form ' +
                        `"Possible Unhandled Promise Rejection (id: ${id}):"`;
                    console.warn(warning);
                },
            });
        }
    }

    public dispose(): void {
        this.enabled = false;
    }

    private reportRejection(client: BacktraceClient, id: number, rejection: Error | string) {
        try {
            client.send(
                new BacktraceReport(
                    rejection,
                    {
                        'error.type': 'Unhandled rejection',
                        unhandledPromiseRejectionId: id,
                    },
                    [],
                    {
                        classifiers: ['UnhandledPromiseRejection'],
                        skipFrames: rejection instanceof Error ? 0 : 1,
                    },
                ),
            );
        } catch (err) {
            warnFailure('failed to report an unhandled rejection', err);
        }
    }
}
