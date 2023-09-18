import { type AttributeType, type BacktraceAttachment } from '@backtrace-labs/sdk-core';
import { NativeModules } from 'react-native';

export class CrashReporter {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private readonly _backtraceReactNative: any;
    private _enable = false;
    constructor() {
        const BacktraceReactNative = NativeModules.BacktraceReactNative;
        if (!BacktraceReactNative) {
            throw new Error('Cannot setup connection to the iOS native layer');
        }
        this._backtraceReactNative = BacktraceReactNative;
    }
    public initialize(
        submissionUrl: string,
        attributes: Record<string, AttributeType>,
        attachments: readonly BacktraceAttachment[],
    ): boolean {
        if (this._enable) {
            console.warn('Native crash reporter is already initialized');
            return false;
        }

        if (attachments.length !== 0) {
            console.log('file attachments unsupported yet.');
        }
        this._backtraceReactNative.initialize(
            submissionUrl.replace('json', 'plcrash'),
            {
                ...attributes,
                'error.type': 'Crash',
            },
            [],
        );
        this._enable = true;
        return true;
    }

    public updateAttributes(attributes: Record<string, AttributeType>) {
        if (!this._enable) {
            return;
        }
        this._backtraceReactNative.useAttributes(attributes);
    }

    public updateAttachments(attachments: string[]) {
        if (!this._enable) {
            return;
        }
        this._backtraceReactNative.useAttachments(attachments);
    }
    public crash(): void {
        if (!this._enable) {
            return;
        }

        this._backtraceReactNative.crash();
    }
}
