// A hang report only exists if the handler hears the native event and sends it; a broken
// subscription loses every report with no error anywhere. Mocked native modules and faked
// app-state changes cover the event flow and the background pause.
import { AppState, NativeModules, Platform } from 'react-native';

// This package's jest config replaces the react-native preset's setupFiles, so the real Platform throws.
jest.mock('react-native', () => {
    const appStateListeners: Array<(state: string) => void> = [];
    let emitterListener: ((payload: unknown) => void) | undefined;

    class NativeEventEmitter {
        public addListener(_: string, callback: (payload: unknown) => void) {
            emitterListener = callback;
            return { remove: jest.fn() };
        }

        public static emit(payload: unknown) {
            emitterListener?.(payload);
        }
    }

    return {
        NativeModules: {},
        Platform: {
            OS: 'android',
            select: (options: Record<string, unknown>) =>
                options.android !== undefined ? options.android : options.default,
        },
        NativeEventEmitter,
        AppState: {
            __listeners: appStateListeners,
            addEventListener: (_: string, callback: (state: string) => void) => {
                appStateListeners.push(callback);
                return { remove: jest.fn() };
            },
        },
    };
});

const watchdogMock = {
    start: jest.fn(),
    stop: jest.fn(),
};
NativeModules.BacktraceAnrWatchdog = watchdogMock;
(globalThis as unknown as { RN$Bridgeless: boolean }).RN$Bridgeless = true;

/* eslint-disable @typescript-eslint/no-var-requires */
const { AnrWatchdogHandler } = require('../src/anr/AnrWatchdogHandler');
const { NativeEventEmitter: EmitterMock } = require('react-native');
/* eslint-enable @typescript-eslint/no-var-requires */

const PAYLOAD = {
    stackTrace: 'android.os.MessageQueue.next(MessageQueue.java:335)\n',
    frames: [{ funcName: 'android.os.MessageQueue.next', library: 'MessageQueue.java', line: 335 }],
};

function createClient() {
    return {
        send: jest.fn().mockResolvedValue({ status: 'Ok' }),
        breadcrumbs: { info: jest.fn() },
    };
}

function appStateListeners(): Array<(state: string) => void> {
    return (AppState as unknown as { __listeners: Array<(state: string) => void> }).__listeners;
}

describe('AnrWatchdogHandler', () => {
    beforeEach(() => {
        watchdogMock.start.mockClear();
        watchdogMock.stop.mockClear();
        appStateListeners().length = 0;
        Platform.OS = 'android';
    });

    it('does not create on platforms other than android', () => {
        Platform.OS = 'ios';
        expect(AnrWatchdogHandler.create()).toBeUndefined();
    });

    it('starts the native watchdog with the configured values', () => {
        AnrWatchdogHandler.create()?.start(createClient() as never, 3000, true);
        expect(watchdogMock.start).toHaveBeenCalledWith(3000, true);
    });

    it('sends a Hang report with the emitted frames and adds a breadcrumb', () => {
        const client = createClient();
        AnrWatchdogHandler.create()?.start(client as never, 0, false);

        EmitterMock.emit(PAYLOAD);

        expect(client.breadcrumbs.info).toHaveBeenCalledWith('ANR detected - thread is blocked');
        const report = client.send.mock.calls[0][0];
        expect(report.attributes['error.type']).toBe('Hang');
        expect(report.stackTrace['main']).toEqual(PAYLOAD.frames);
    });

    it('pauses detection in the background and resumes it in the foreground', () => {
        AnrWatchdogHandler.create()?.start(createClient() as never, 3000, true);
        const [onAppStateChange] = appStateListeners();

        onAppStateChange('background');
        expect(watchdogMock.stop).toHaveBeenCalledTimes(1);

        onAppStateChange('active');
        expect(watchdogMock.start).toHaveBeenLastCalledWith(3000, true);
        expect(watchdogMock.start).toHaveBeenCalledTimes(2);
    });

    it('stops the native watchdog on dispose', () => {
        const handler = AnrWatchdogHandler.create();
        handler?.start(createClient() as never, 0, false);
        handler?.dispose();
        expect(watchdogMock.stop).toHaveBeenCalled();
    });
});
