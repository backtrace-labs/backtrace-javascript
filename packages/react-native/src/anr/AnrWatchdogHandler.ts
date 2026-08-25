import { BacktraceReport, type BacktraceStackFrame } from '@backtrace/sdk-core';
import {
    AppState,
    NativeEventEmitter,
    NativeModules,
    Platform,
    type EmitterSubscription,
    type NativeEventSubscription,
} from 'react-native';
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
    private _appStateSubscription?: NativeEventSubscription;

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

    public start(client: BacktraceClient, timeout: number, disableWhenDebuggerAttached: boolean): void {
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

        // Android freezes backgrounded apps, and the watchdog would misread the resume as a hang
        this._appStateSubscription = AppState.addEventListener('change', (state) => {
            if (state === 'background') {
                this._watchdog.stop();
            } else if (state === 'active') {
                this._watchdog.start(timeout, disableWhenDebuggerAttached);
            }
        });

        this._watchdog.start(timeout, disableWhenDebuggerAttached);
    }

    public dispose(): void {
        this._subscription?.remove();
        this._subscription = undefined;
        this._appStateSubscription?.remove();
        this._appStateSubscription = undefined;
        this._watchdog.stop?.();
    }
}
