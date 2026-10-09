import { warnFailure, type AttributeType, type BacktraceAttachment, type FileSystem } from '@backtrace/sdk-core';
import { NativeModules } from 'react-native';
import { BacktraceFileAttachment } from '../attachment/BacktraceFileAttachment';
import { DebuggerHelper } from '../common/DebuggerHelper';

export class CrashReporter {
    private static readonly BacktraceReactNative = NativeModules.BacktraceReactNative;

    private _enabled = false;
    private _updateFailureLogged = false;

    constructor(private readonly _fileSystem: FileSystem) {}

    /**
     * Determines if the crash reporting solution was already initialized.
     */
    private static initialized = false;

    private static activeReporter?: CrashReporter;
    private static nativeSubmissionUrl?: string;
    private static nativeDatabasePath?: string;
    private static nativeAttributeNames = new Set<string>();

    public initialize(
        submissionUrl: string,
        databasePath: string,
        attributes: Record<string, AttributeType>,
        attachments: readonly BacktraceAttachment[],
    ): boolean {
        const nativeDatabasePath = `${databasePath}/native`;
        if (CrashReporter.initialized) {
            return this.takeOver(submissionUrl, nativeDatabasePath, attributes, attachments);
        }
        if (!CrashReporter.BacktraceReactNative) {
            warnFailure('native crash reporting is off, BacktraceReactNative is not linked');
            return false;
        }

        if (!DebuggerHelper.isNativeBridgeEnabled()) {
            warnFailure('native crash reporting is off, the native bridge is not available');
            return false;
        }

        const nativeAttributes = this.convertAttributes(attributes);
        try {
            this._fileSystem.createDirSync(nativeDatabasePath);

            // iOS returns nothing on success; only an explicit false is a failure.
            const result = CrashReporter.BacktraceReactNative.initialize(
                submissionUrl,
                nativeDatabasePath,
                {
                    ...nativeAttributes,
                    'error.type': 'Crash',
                },
                this.convertAttachments(attachments),
            );
            if (result === false) {
                warnFailure('native crash reporting is off, the native crash handler did not start');
                return false;
            }
        } catch (err) {
            warnFailure('native crash reporting is off', err);
            return false;
        }

        CrashReporter.initialized = true;
        CrashReporter.nativeSubmissionUrl = submissionUrl;
        CrashReporter.nativeDatabasePath = nativeDatabasePath;
        CrashReporter.nativeAttributeNames = new Set(Object.keys(nativeAttributes));
        this.enable();
        return true;
    }

    public updateAttributes(attributes: Record<string, AttributeType>) {
        if (!this._enabled) {
            return;
        }
        this.useAttributes(this.convertAttributes(attributes));
    }

    public updateAttachments(attachments: readonly BacktraceAttachment[]) {
        if (!this._enabled) {
            return;
        }
        if (typeof CrashReporter.BacktraceReactNative.useAttachments !== 'function') {
            return;
        }
        this.update(() => CrashReporter.BacktraceReactNative.useAttachments(this.convertAttachments(attachments)));
    }

    public static crash(): void {
        if (CrashReporter.BacktraceReactNative) {
            CrashReporter.BacktraceReactNative.crash();
        } else {
            throw new Error('Native binding is not available');
        }
    }

    // Flags the imminent native crash as an already-reported JS fatal (iOS); no-op elsewhere.
    public static markFatalError(): void {
        CrashReporter.BacktraceReactNative?.markFatalError?.();
    }

    public dispose(): void {
        this._enabled = false;
        if (CrashReporter.activeReporter === this) {
            CrashReporter.activeReporter = undefined;
        }
    }

    private takeOver(
        submissionUrl: string,
        nativeDatabasePath: string,
        attributes: Record<string, AttributeType>,
        attachments: readonly BacktraceAttachment[],
    ): boolean {
        if (CrashReporter.activeReporter) {
            warnFailure('native crash reporting stays with the client that is still running, dispose it first');
            return false;
        }
        if (
            submissionUrl !== CrashReporter.nativeSubmissionUrl ||
            nativeDatabasePath !== CrashReporter.nativeDatabasePath
        ) {
            warnFailure(
                "native crash reports keep the first client's submission url and database path until the app restarts",
            );
        }

        const blankedPreviousAttributes = Object.fromEntries(
            [...CrashReporter.nativeAttributeNames].map((name) => [name, '']),
        );
        this.enable();
        this.useAttributes({ ...blankedPreviousAttributes, ...this.convertAttributes(attributes) });
        this.updateAttachments(attachments);
        return true;
    }

    private enable() {
        this._enabled = true;
        CrashReporter.activeReporter = this;
    }

    private useAttributes(attributes: Record<string, string>) {
        for (const name of Object.keys(attributes)) {
            CrashReporter.nativeAttributeNames.add(name);
        }
        this.update(() => CrashReporter.BacktraceReactNative.useAttributes(attributes));
    }

    private update(fn: () => void) {
        try {
            fn();
        } catch (err) {
            if (!this._updateFailureLogged) {
                this._updateFailureLogged = true;
                warnFailure('failed to update native crash report attributes or attachments', err);
            }
        }
    }

    /**
     * Native layer might not support fully all types supported by the JavaScript SDK. The method converts attributes
     * to model fully supported by the native env
     */
    private convertAttributes(attributes: Record<string, AttributeType>): Record<string, string> {
        return Object.fromEntries(Object.entries(attributes).map(([key, value]) => [key, value?.toString() ?? '']));
    }

    private convertAttachments(attachments: readonly BacktraceAttachment[]): string[] {
        return attachments
            .filter((n) => n instanceof BacktraceFileAttachment)
            .map((n) => (n as BacktraceFileAttachment).filePath);
    }
}
