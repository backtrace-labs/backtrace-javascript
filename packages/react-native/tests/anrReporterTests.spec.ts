// The reporter sends each ANR the system recorded exactly once: it saves the timestamp of the
// last accepted report and resumes from it on the next launch. Faked native records and send
// results walk the retry and loss orderings a device cannot produce on demand.
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

const LAST_TIMESTAMP_PATH = '/data/backtrace-anr-last-timestamp';

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
    } as { threads?: object[] } & Record<string, unknown>;
}

const FRAMES = [{ funcName: 'android.os.MessageQueue.next', library: 'MessageQueue.java', line: 335 }];

const OTHER_THREADS = [
    { name: 'FinalizerDaemon', frames: [{ funcName: 'java.lang.Object.wait', library: 'Object.java', line: 405 }] },
    { name: 'FinalizerDaemon', frames: [{ funcName: 'java.lang.Thread.run', library: 'Thread.java', line: 1572 }] },
];

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

    it('passes the stored last timestamp to the native reader', async () => {
        const fileSystem = createFileSystem({ [LAST_TIMESTAMP_PATH]: '1234' });
        getAnrExitInfo.mockResolvedValue([]);

        await AnrReporter.create(fileSystem)?.report(createClient());

        expect(getAnrExitInfo).toHaveBeenCalledWith(1234);
    });

    it('sends records oldest first and saves the timestamp after each accepted send', async () => {
        const fileSystem = createFileSystem();
        getAnrExitInfo.mockResolvedValue([record(1, FRAMES), record(2, FRAMES)]);
        const send = jest.fn().mockResolvedValue({ status: 'Ok' });

        await AnrReporter.create(fileSystem)?.report(createClient(send));

        expect(send).toHaveBeenCalledTimes(2);
        expect(send.mock.calls[0][0].attributes['error.type']).toBe('Hang');
        expect(send.mock.calls[0][0].timestamp).toBe(1);
        expect(send.mock.calls[1][0].timestamp).toBe(2);
        expect(fileSystem.storage.get(LAST_TIMESTAMP_PATH)).toBe('2');
    });

    it('stops on a failed send and keeps the last timestamp at the last accepted record', async () => {
        const fileSystem = createFileSystem();
        getAnrExitInfo.mockResolvedValue([record(1, FRAMES), record(2, FRAMES), record(3, FRAMES)]);
        const send = jest
            .fn()
            .mockResolvedValueOnce({ status: 'Ok' })
            .mockResolvedValueOnce({ status: 'Network Error' });

        await AnrReporter.create(fileSystem)?.report(createClient(send));

        expect(send).toHaveBeenCalledTimes(2);
        expect(fileSystem.storage.get(LAST_TIMESTAMP_PATH)).toBe('1');
    });

    it('saves the timestamp on a failed send that the database stores for retry', async () => {
        const fileSystem = createFileSystem();
        getAnrExitInfo.mockResolvedValue([record(1, FRAMES), record(2, FRAMES)]);
        const send = jest.fn().mockResolvedValue({ status: 'Network Error' });
        const client = { send, database: {} } as never;

        await AnrReporter.create(fileSystem)?.report(client);

        expect(send).toHaveBeenCalledTimes(2);
        expect(fileSystem.storage.get(LAST_TIMESTAMP_PATH)).toBe('2');
    });

    it('keeps the last timestamp on a rate-limited send even with a database', async () => {
        const fileSystem = createFileSystem();
        getAnrExitInfo.mockResolvedValue([record(1, FRAMES)]);
        const send = jest.fn().mockResolvedValue({ status: 'Limit reached' });
        const client = { send, database: {} } as never;

        await AnrReporter.create(fileSystem)?.report(client);

        expect(fileSystem.storage.get(LAST_TIMESTAMP_PATH)).toBeUndefined();
    });

    it('skips a record without frames but still saves its timestamp', async () => {
        const fileSystem = createFileSystem();
        getAnrExitInfo.mockResolvedValue([record(7, undefined)]);
        const send = jest.fn();

        await AnrReporter.create(fileSystem)?.report(createClient(send));

        expect(send).not.toHaveBeenCalled();
        expect(fileSystem.storage.get(LAST_TIMESTAMP_PATH)).toBe('7');
    });

    it('attaches the parsed frames as the main thread and the raw dump as an attachment', async () => {
        const fileSystem = createFileSystem();
        getAnrExitInfo.mockResolvedValue([record(1, FRAMES)]);
        const send = jest.fn().mockResolvedValue({ status: 'Ok' });

        await AnrReporter.create(fileSystem)?.report(createClient(send));

        const report = send.mock.calls[0][0];
        expect(report.stackTrace['main']).toEqual(FRAMES);
        expect(report.attachments).toHaveLength(1);
        expect(report.attachments[0].name).toBe('anr-stacktrace.txt');
        expect(report.attributes['PID']).toBe(123);
    });

    it('attaches the other threads from the dump and renames collisions', async () => {
        const fileSystem = createFileSystem();
        const anr = record(1, FRAMES);
        anr.threads = OTHER_THREADS;
        getAnrExitInfo.mockResolvedValue([anr]);
        const send = jest.fn().mockResolvedValue({ status: 'Ok' });

        await AnrReporter.create(fileSystem)?.report(createClient(send));

        const report = send.mock.calls[0][0];
        expect(report.stackTrace['main']).toEqual(FRAMES);
        expect(report.stackTrace['FinalizerDaemon']).toEqual(OTHER_THREADS[0].frames);
        expect(report.stackTrace['FinalizerDaemon-2']).toEqual(OTHER_THREADS[1].frames);
    });
});
