import { BacktraceReport } from '@backtrace-labs/sdk-core';
import { NativeModules } from 'react-native';
import { BacktraceClient } from '../../BacktraceClient';
import { DebuggerHelper } from '../../common/DebuggerHelper';
import { UnhandledExceptionHandler } from '../UnhandledExceptionHandler';
export class AndroidUnhandledExceptionHandler extends UnhandledExceptionHandler {
    private readonly _unhandledExceptionHandler = NativeModules.BacktraceAndroidBackgroundUnhandledExceptionHandler;
    public captureManagedErrors(client: BacktraceClient) {
        super.captureManagedErrors(client);
        if (!this._unhandledExceptionHandler) {
            return;
        }
        if (DebuggerHelper.isConnected()) {
            return;
        }

        this._unhandledExceptionHandler.start(async (classifier: string, message: string, stackTrace: string) => {
            // to do:
            // save the report when the database feature is enabled
            console.log(`Backtrace: ${message} ${classifier} Stack Trace: ${stackTrace}`);
            await client.send(
                new BacktraceReport(
                    message,
                    {
                        'error.type': 'Unhandled exception',
                    },
                    [],
                    {
                        classifiers: [classifier],
                    },
                ),
            );
        });
    }

    public dispose(): void {
        super.dispose();
        if (this._unhandledExceptionHandler) {
            this._unhandledExceptionHandler.stop();
        }
    }
}
