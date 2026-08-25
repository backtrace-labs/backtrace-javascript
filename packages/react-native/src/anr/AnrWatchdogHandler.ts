import { BacktraceReport, type BacktraceStackFrame } from '@backtrace/sdk-core';
import { NativeEventEmitter, NativeModules, Platform, type EmitterSubscription } from 'react-native';
import type { BacktraceClient } from '../BacktraceClient';
import { DebuggerHelper } from '../common/DebuggerHelper';
import { AnrException } from './AnrException';

const AnrDetectedEvent = 'BacktraceAnrDetected';

interface AnrDetectedPayload {
    stackTrace: string;
    frames: BacktraceStackFrame[];
}

export class AnrWatchdogHandler {
    private _subscription?: EmitterSubscription;

    private constructor(private readonly _watchdog: NonNullable<typeof NativeModules.BacktraceAnrWatchdog>) {}

    public static create(): AnrWatchdogHandler | undefined {
        if (Platform.OS !== 'android') {
            return undefined;
        }

        if (!DebuggerHelper.isNativeBridgeEnabled()) {
            return undefined;
        }

        const watchdog = NativeModules.BacktraceAnrWatchdog;
        if (!watchdog?.start) {
            return undefined;
        }

        return new AnrWatchdogHandler(watchdog);
    }

    public start(client: BacktraceClient, timeout: number, debug: boolean): void {
        this._subscription = new NativeEventEmitter(this._watchdog).addListener(
            AnrDetectedEvent,
            (payload: AnrDetectedPayload) => {
                client.breadcrumbs?.info('ANR detected - thread is blocked');

                const report = new BacktraceReport(
                    new AnrException('Application Not Responding | Blocked thread detected', payload.stackTrace),
                    { 'error.type': 'Hang' },
                    [],
                );
                report.addStackTrace('main', payload.frames);
                client.send(report);
            },
        );

        this._watchdog.start(timeout, debug);
    }

    public dispose(): void {
        this._subscription?.remove();
        this._subscription = undefined;
        this._watchdog.stop?.();
    }
}
