import { type AttributeType, type BacktraceAttachment, type FileSystem } from '@backtrace/sdk-core';
import { NativeModules } from 'react-native';
import { BacktraceFileAttachment } from '../attachment/BacktraceFileAttachment';
import { DebuggerHelper } from '../common/DebuggerHelper';

export class CrashReporter {
    private static readonly BacktraceReactNative = NativeModules.BacktraceReactNative;

    private _enabled = false;

    constructor(private readonly _fileSystem: FileSystem) {}

    /**
     * Determines if the crash reporting solution was already initialized.
     */
    private static initialized = false;

    public initialize(
        submissionUrl: string,
        databasePath: string,
        attributes: Record<string, AttributeType>,
        attachments: readonly BacktraceAttachment[],
    ): boolean {
        if (CrashReporter.initialized) {
            return false;
        }
        // verify if the native bindings are available
        if (!CrashReporter.BacktraceReactNative) {
            return false;
        }

        if (DebuggerHelper.isConnected()) {
            return false;
        }

        const nativeDatabasePath = `${databasePath}/native`;
        this._fileSystem.createDirSync(nativeDatabasePath);

        CrashReporter.BacktraceReactNative.initialize(
            submissionUrl,
            nativeDatabasePath,
            {
                ...this.convertAttributes(attributes),
                'error.type': 'Crash',
            },
            attachments
                .filter((n) => n instanceof BacktraceFileAttachment)
                .map((n) => (n as BacktraceFileAttachment).filePath),
        );
        this._enabled = true;
        CrashReporter.initialized = true;
        return true;
    }

    public updateAttributes(attributes: Record<string, AttributeType>) {
        if (!this._enabled) {
            return;
        }
        CrashReporter.BacktraceReactNative.useAttributes(this.convertAttributes(attributes));
    }

    public static crash(): void {
        if (CrashReporter.BacktraceReactNative) {
            CrashReporter.BacktraceReactNative.crash();
        } else {
            throw new Error('Native binding is not available');
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
