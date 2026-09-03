import { BacktraceReport } from '@backtrace/sdk-core';
import { NativeModules } from 'react-native';
import { BacktraceClient } from '../../BacktraceClient';
import { DebuggerHelper } from '../../common/DebuggerHelper';
import { AndroidStackTraceConverter } from '../../converters/AndroidStackTraceConverter';
import { UnhandledExceptionHandler } from '../UnhandledExceptionHandler';
import { AndroidUnhandledException } from './AndroidUnhandledException';
export class AndroidUnhandledExceptionHandler extends UnhandledExceptionHandler {
    private readonly _unhandledExceptionHandler = NativeModules.BacktraceAndroidBackgroundUnhandledExceptionHandler;
    private readonly _androidStackTraceConverter = new AndroidStackTraceConverter();
    public captureManagedErrors(client: BacktraceClient) {
        super.captureManagedErrors(client);
        if (!this._unhandledExceptionHandler) {
            return;
        }
        if (!DebuggerHelper.isNativeBridgeEnabled()) {
            return;
        }

        this._unhandledExceptionHandler.start(async (classifier: string, message: string, stackTrace: string) => {
            try {
                const report = new BacktraceReport(
                    new AndroidUnhandledException(classifier, message, stackTrace),
                    {
                        'error.type': 'Unhandled exception',
                    },
                    [],
                );
                report.addStackTrace('main', this._androidStackTraceConverter.convert(stackTrace));
                await client.send(report);
            } catch {
                // nothing to recover: the process is dying
            } finally {
                this._unhandledExceptionHandler.reportProcessed?.();
            }
        });
    }

    public dispose(): void {
        super.dispose();
        if (this._unhandledExceptionHandler) {
            this._unhandledExceptionHandler.stop();
        }
    }
}
