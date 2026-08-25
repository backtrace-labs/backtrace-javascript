import { NativeModules, Platform } from 'react-native';

// This package's jest config replaces the react-native preset's setupFiles, so the real Platform throws.
jest.mock('react-native', () => ({
    NativeModules: {},
    Platform: {
        OS: 'android',
        select: (options: Record<string, unknown>) =>
            options.android !== undefined ? options.android : options.default,
    },
}));

const getAnrExitInfo = jest.fn();
NativeModules.BacktraceReactNative = { getAnrExitInfo };
(globalThis as unknown as { RN$Bridgeless: boolean }).RN$Bridgeless = true;

/* eslint-disable @typescript-eslint/no-var-requires */
const { AnrReporter } = require('../src/anr/AnrReporter');
/* eslint-enable @typescript-eslint/no-var-requires */

const MARKER_PATH = '/data/backtrace-anr-marker';

function createFileSystem(files: Record<string, string> = {}) {
    const storage = new Map(Object.entries(files));
    return {
        storage,
        applicationDirectory: () => '/data',
        exists: async (path: string) => storage.has(path),
        readFile: async (path: string) => storage.get(path) as string,
        writeFile: async (path: string, content: string) => {
            storage.set(path, content);
        },
    };
}

function createClient(send = jest.fn().mockResolvedValue({ status: 'Ok' })) {
    return { send } as never;
}

function record(timestamp: number, frames?: object[]) {
    return {
        timestamp,
        message: `anr at ${timestamp}`,
        attributes: { PID: 123 },
        stackTrace: 'raw dump',
        mainThreadFrames: frames,
    };
}

const FRAMES = [{ funcName: 'android.os.MessageQueue.next', library: 'MessageQueue.java', line: 335 }];

describe('AnrReporter', () => {
    beforeEach(() => {
        getAnrExitInfo.mockReset();
        Platform.OS = 'android';
    });

    it('does not create on platforms other than android', () => {
        Platform.OS = 'ios';
        expect(AnrReporter.create(createFileSystem())).toBeUndefined();
    });

    it('does not create without the native module method', () => {
        const saved = NativeModules.BacktraceReactNative;
        NativeModules.BacktraceReactNative = {};
        expect(AnrReporter.create(createFileSystem())).toBeUndefined();
        NativeModules.BacktraceReactNative = saved;
    });

    it('passes the stored marker to the native reader', async () => {
        const fileSystem = createFileSystem({ [MARKER_PATH]: '1234' });
        getAnrExitInfo.mockResolvedValue([]);

        await AnrReporter.create(fileSystem)?.report(createClient());

        expect(getAnrExitInfo).toHaveBeenCalledWith(1234);
    });

    it('sends records oldest first and advances the marker after each accepted send', async () => {
        const fileSystem = createFileSystem();
        getAnrExitInfo.mockResolvedValue([record(1, FRAMES), record(2, FRAMES)]);
        const send = jest.fn().mockResolvedValue({ status: 'Ok' });

        await AnrReporter.create(fileSystem)?.report(createClient(send));

        expect(send).toHaveBeenCalledTimes(2);
        expect(send.mock.calls[0][0].attributes['error.type']).toBe('Hang');
        expect(fileSystem.storage.get(MARKER_PATH)).toBe('2');
    });

    it('stops on a failed send and keeps the marker at the last accepted record', async () => {
        const fileSystem = createFileSystem();
        getAnrExitInfo.mockResolvedValue([record(1, FRAMES), record(2, FRAMES), record(3, FRAMES)]);
        const send = jest
            .fn()
            .mockResolvedValueOnce({ status: 'Ok' })
            .mockResolvedValueOnce({ status: 'Network Error' });

        await AnrReporter.create(fileSystem)?.report(createClient(send));

        expect(send).toHaveBeenCalledTimes(2);
        expect(fileSystem.storage.get(MARKER_PATH)).toBe('1');
    });

    it('skips a record without frames but still advances the marker', async () => {
        const fileSystem = createFileSystem();
        getAnrExitInfo.mockResolvedValue([record(7, undefined)]);
        const send = jest.fn();

        await AnrReporter.create(fileSystem)?.report(createClient(send));

        expect(send).not.toHaveBeenCalled();
        expect(fileSystem.storage.get(MARKER_PATH)).toBe('7');
    });

    it('attaches the parsed frames as the main thread and the raw dump as an attribute', async () => {
        const fileSystem = createFileSystem();
        getAnrExitInfo.mockResolvedValue([record(1, FRAMES)]);
        const send = jest.fn().mockResolvedValue({ status: 'Ok' });

        await AnrReporter.create(fileSystem)?.report(createClient(send));

        const report = send.mock.calls[0][0];
        expect(report.stackTrace['main']).toEqual(FRAMES);
        expect(report.attributes['ANR stacktrace']).toBe('raw dump');
        expect(report.attributes['PID']).toBe(123);
    });
});
