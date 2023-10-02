import { type AttributeType, type BacktraceAttachment } from '@backtrace-labs/sdk-core';
import { NativeModules } from 'react-native';
import { DebuggerHelper } from '../common/DebuggerHelper';

export class CrashReporter {
    private readonly _backtraceReactNative = NativeModules.BacktraceReactNative;

    private _enabled = false;

    /**
     * Determines if the crash reporting solution was already initialized.
     */
    private static initialized = false;

    public initialize(
        submissionUrl: string,
        attributes: Record<string, AttributeType>,
        attachments: readonly BacktraceAttachment[],
    ): boolean {
        if (CrashReporter.initialized) {
            return false;
        }
        // verify if the native bindings are available
        if (!this._backtraceReactNative) {
            return false;
        }

        if (DebuggerHelper.isConnected()) {
            return false;
        }

        if (attachments.length !== 0) {
            // to do:
            // add attachment support with the new file system
            console.warn('File attachments are unsupported.');
        }

        this._backtraceReactNative.initialize(
            submissionUrl,
            {
                ...this.convertAttributes(attributes),
                'error.type': 'Crash',
            },
            [],
        );
        this._enabled = true;
        CrashReporter.initialized = true;
        return true;
    }

    public updateAttributes(attributes: Record<string, AttributeType>) {
        if (!this._enabled) {
            return;
        }
        this._backtraceReactNative.useAttributes(this.convertAttributes(attributes));
    }

    public crash(): void {
        if (this._backtraceReactNative) {
            this._backtraceReactNative.crash();
        }
    }

    public dispose(): void {
        this._enabled = false;
    }

    /**
     * Native layer might not support fully all types supported by the JavaScript SDK. The method converts attributes
     * to model fully supported by the native env
     */
    private convertAttributes(attributes: Record<string, AttributeType>): Record<string, string> {
        return Object.fromEntries(Object.entries(attributes).map(([key, value]) => [key, value?.toString() ?? '']));
    }
}
