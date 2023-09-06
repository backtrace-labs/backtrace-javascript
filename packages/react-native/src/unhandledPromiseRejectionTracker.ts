import { BacktraceReport } from '@backtrace-labs/sdk-core';
import { BacktraceClient } from './BacktraceClient';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const rejectionTracking = require('promise/setimmediate/rejection-tracking');

export function enableUnhandledPromiseRejectionTracker(client: BacktraceClient) {
    rejectionTracking.enable({
        allRejections: true,
        onUnhandled: (id: number, rejection: Error) => {
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
