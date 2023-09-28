import { BacktraceReport } from '@backtrace-labs/sdk-core';
import { BacktraceClient } from '../BacktraceClient';
import { hermes } from '../common/hermesHelper';
import { type ExceptionHandler } from './ExceptionHandler';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const rejectionTracking = require('promise/setimmediate/rejection-tracking');

export class UnhandledExceptionHandler implements ExceptionHandler {
    protected enabled = true;
    public captureManagedErrors(client: BacktraceClient) {
        const globalErrorHandler = ErrorUtils.getGlobalHandler();
        ErrorUtils.setGlobalHandler((error: Error, fatal?: boolean) => {
            if (!this.enabled) {
                return;
            }
            client.send(error, {
                'error.type': 'Unhandled exception',
                fatal,
            });
            globalErrorHandler(error, fatal);
        });
    }

    public captureUnhandledPromiseRejections(client: BacktraceClient) {
        const hermesInternal = hermes();

        if (hermesInternal?.hasPromise?.() && hermesInternal?.enablePromiseRejectionTracker) {
            hermesInternal.enablePromiseRejectionTracker({
                allRejections: true,
                onUnhandled: (id: number, rejection: Error | object = {}) => {
                    if (!this.enabled) {
                        return;
                    }
                    client.send(
                        new BacktraceReport(
                            rejection as Error,
                            {
                                'error.type': 'Unhandled exception',
                                unhandledPromiseRejectionId: id,
                            },
                            [],
                            {
                                classifiers: ['UnhandledPromiseRejection'],
                                skipFrames: rejection instanceof Error ? 0 : 1,
                            },
                        ),
                    );
                },
            });
        } else {
            rejectionTracking.enable({
                allRejections: true,
                onUnhandled: (id: number, rejection: Error) => {
                    if (this.enabled) {
                        client.send(
                            new BacktraceReport(
                                rejection as Error,
                                {
                                    'error.type': 'Unhandled exception',
                                    unhandledPromiseRejectionId: id,
                                },
                                [],
                                {
                                    classifiers: ['UnhandledPromiseRejection'],
                                    skipFrames: rejection instanceof Error ? 0 : 1,
                                },
                            ),
                        );
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
                        try {
                            // eslint-disable-next-line @typescript-eslint/no-var-requires
                            message = require('pretty-format')(rejection);
                        } catch {
                            message = typeof rejection === 'string' ? rejection : JSON.stringify({ ...rejection });
                        }
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
}
