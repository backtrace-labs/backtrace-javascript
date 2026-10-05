import { BreadcrumbLogLevel, BreadcrumbType, SessionFiles, type RawBreadcrumb } from '@backtrace/sdk-core';
import assert from 'assert';
import path from 'path';
import { Platform } from 'react-native';
import ReactNativeFormData from 'react-native/Libraries/Network/FormData';
import { promisify } from 'util';
import { WritableStream } from 'web-streams-polyfill';
import { FileSnapshotAttachment } from '../src/attachment/FileSnapshotAttachment';
import { FileBreadcrumbsStorage } from '../src/breadcrumbs/FileBreadcrumbsStorage';
import { ReactNativeRequestHandler } from '../src/ReactNativeRequestHandler';
import { mockStreamFileSystem } from './_mocks/fileSystem';

const nextTick = promisify(process.nextTick);
const nextMacrotask = () => new Promise((resolve) => setImmediate(resolve));
const filePath = '/breadcrumbs/bt-breadcrumbs-0';
const submissionUrl = 'https://submit.backtrace.io/test/token/json';

function breadcrumb(message: string): RawBreadcrumb {
    return { message, level: BreadcrumbLogLevel.Info, type: BreadcrumbType.Manual };
}

function mockFileSystemWithNativeAppends() {
    const fs = mockStreamFileSystem();
    fs.createWriteStream.mockImplementation((p: string) => {
        const writable = new WritableStream<string>({
            async write(str) {
                await nextMacrotask();
                fs.files[path.resolve(p)] = (fs.files[path.resolve(p)] ?? '') + str;
            },
        });
        (writable as { path?: string }).path = p;
        return writable;
    });
    return fs;
}

describe('FileSnapshotAttachment', () => {
    const originalOS = Platform.OS;
    const originalFetch = global.fetch;
    const originalFormData = global.FormData;

    beforeEach(() => {
        Platform.OS = 'android';
    });

    afterEach(() => {
        Platform.OS = originalOS;
        global.fetch = originalFetch;
        global.FormData = originalFormData;
    });

    it('returns the file content on Android', () => {
        const fs = mockStreamFileSystem({ [filePath]: '{"id":1}\n{"id":2}\n' });
        const attachment = new FileSnapshotAttachment(fs, filePath, 'bt-breadcrumbs-0', 'application/json');

        expect(attachment.get()).toEqual({
            string: '{"id":1}\n{"id":2}\n',
            name: 'bt-breadcrumbs-0',
            type: 'application/json',
        });
    });

    it('leaves out a line that is still being written', () => {
        const fs = mockStreamFileSystem({ [filePath]: '{"id":1}\n{"id"' });
        const attachment = new FileSnapshotAttachment(fs, filePath, 'bt-breadcrumbs-0', 'application/json');

        expect(attachment.get()).toEqual(expect.objectContaining({ string: '{"id":1}\n' }));
    });

    it('returns nothing when the file is missing', () => {
        const attachment = new FileSnapshotAttachment(
            mockStreamFileSystem(),
            filePath,
            'bt-breadcrumbs-0',
            'application/json',
        );

        expect(attachment.get()).toBeUndefined();
    });

    it('returns the file location on iOS', () => {
        Platform.OS = 'ios';
        const fs = mockStreamFileSystem({ [filePath]: '{"id":1}\n' });
        const attachment = new FileSnapshotAttachment(fs, filePath, 'bt-breadcrumbs-0', 'application/json');

        expect(attachment.get()).toEqual(expect.objectContaining({ uri: filePath }));
    });

    it('adds queued lines that have not reached the file', () => {
        const fs = mockStreamFileSystem({ [filePath]: '{"id":1}\n' });
        const attachment = new FileSnapshotAttachment(fs, filePath, 'bt-breadcrumbs-0', 'application/json', {
            queuedLines: () => ['{"id":2}\n'],
        });

        expect(attachment.get()).toEqual(expect.objectContaining({ string: '{"id":1}\n{"id":2}\n' }));
    });

    it('does not repeat queued lines that already reached the file', () => {
        const fs = mockStreamFileSystem({ [filePath]: '{"id":1}\n{"id":2}\n' });
        const attachment = new FileSnapshotAttachment(fs, filePath, 'bt-breadcrumbs-0', 'application/json', {
            queuedLines: () => ['{"id":2}\n', '{"id":3}\n'],
        });

        expect(attachment.get()).toEqual(expect.objectContaining({ string: '{"id":1}\n{"id":2}\n{"id":3}\n' }));
    });

    it('returns the queued lines when the file has none yet', () => {
        const fs = mockStreamFileSystem({ [filePath]: '' });
        const attachment = new FileSnapshotAttachment(fs, filePath, 'bt-breadcrumbs-0', 'application/json', {
            queuedLines: () => ['{"id":1}\n'],
        });

        expect(attachment.get()).toEqual(expect.objectContaining({ string: '{"id":1}\n' }));
    });

    it('uploads breadcrumbs logged right before the send on Android', async () => {
        global.FormData = ReactNativeFormData as unknown as typeof FormData;
        const fs = mockFileSystemWithNativeAppends();
        const session = new SessionFiles(fs, '.', { id: 'sessionId', timestamp: Date.now() });
        const storage = new FileBreadcrumbsStorage(session, fs, { maximumBreadcrumbs: 100 });
        storage.add(breadcrumb('written earlier'));
        await nextMacrotask();
        await nextMacrotask();

        storage.add(breadcrumb('logged right before the send'));
        const [attachment] = storage.getAttachments();
        assert(attachment);
        expect(fs.readFileSync(attachment.filePath)).toContain('written earlier');
        expect(fs.readFileSync(attachment.filePath)).not.toContain('logged right before the send');

        let body: ReactNativeFormData | undefined;
        global.fetch = jest.fn(async (_: string, init: { body: ReactNativeFormData }) => {
            body = init.body;
            return { status: 200, json: () => Promise.resolve({}) };
        }) as unknown as typeof fetch;

        await new ReactNativeRequestHandler({ url: submissionUrl }).postError(submissionUrl, '{}', [attachment]);
        await nextMacrotask();
        await nextMacrotask();

        const part = body?.getParts().find((p) => p.fieldName === 'attachment_bt-breadcrumbs-0');
        expect(part?.string).toEqual(fs.readFileSync(attachment.filePath));
        expect(part?.string?.match(/"message":"[^"]+"/g)).toEqual([
            '"message":"written earlier"',
            '"message":"logged right before the send"',
        ]);
    });

    it('keeps breadcrumbs written during an upload out of that upload on Android', async () => {
        global.FormData = ReactNativeFormData as unknown as typeof FormData;
        const fs = mockStreamFileSystem();
        const session = new SessionFiles(fs, '.', { id: 'sessionId', timestamp: Date.now() });
        const storage = new FileBreadcrumbsStorage(session, fs, { maximumBreadcrumbs: 100 });
        storage.add(breadcrumb('before upload'));
        await nextTick();

        const [attachment] = storage.getAttachments();
        assert(attachment);
        const contentBeforeUpload = fs.readFileSync(attachment.filePath);

        let body: ReactNativeFormData | undefined;
        global.fetch = jest.fn(async (_: string, init: { body: ReactNativeFormData }) => {
            body = init.body;
            storage.add(breadcrumb('during upload'));
            await nextTick();
            return { status: 200, json: () => Promise.resolve({}) };
        }) as unknown as typeof fetch;

        await new ReactNativeRequestHandler({ url: submissionUrl }).postError(submissionUrl, '{}', [attachment]);

        expect(fs.readFileSync(attachment.filePath)).toContain('during upload');
        expect(body?.getParts()).toContainEqual(
            expect.objectContaining({
                fieldName: 'attachment_bt-breadcrumbs-0',
                string: contentBeforeUpload,
                headers: {
                    'content-disposition': 'form-data; name="attachment_bt-breadcrumbs-0"; filename="bt-breadcrumbs-0"',
                    'content-type': 'application/json',
                },
            }),
        );
    });

    describe('with FileBreadcrumbsStorage', () => {
        async function settleWrites() {
            for (let i = 0; i < 20; i++) {
                await nextMacrotask();
            }
        }

        function createStorage(limits: { maximumBreadcrumbs?: number; maximumTotalBreadcrumbsSize?: number }) {
            const fs = mockFileSystemWithNativeAppends();
            const session = new SessionFiles(fs, '.', { id: 'sessionId', timestamp: Date.now() });
            return { fs, storage: new FileBreadcrumbsStorage(session, fs, limits) };
        }

        function uploadedMessages(attachments: FileSnapshotAttachment[]) {
            return attachments
                .map((a) => a.get())
                .flatMap((part) => (part && 'string' in part ? (part.string.match(/[^\n]+/g) ?? []) : []))
                .map((line) => JSON.parse(line).message);
        }

        it('adds a queued line to the newest file only', async () => {
            const { storage } = createStorage({ maximumBreadcrumbs: 4 });
            ['1', '2', '3'].forEach((m) => storage.add(breadcrumb(m)));
            await settleWrites();

            storage.add(breadcrumb('4'));

            expect(uploadedMessages(storage.getAttachments())).toEqual(['1', '2', '3', '4']);
        });

        it('does not repeat written lines in a newest file that is still empty', async () => {
            const { fs, storage } = createStorage({ maximumBreadcrumbs: 4 });
            ['1', '2'].forEach((m) => storage.add(breadcrumb(m)));
            await settleWrites();

            storage.add(breadcrumb('3'));
            await nextTick();
            const attachments = storage.getAttachments();

            expect(attachments).toHaveLength(2);
            expect(fs.readFileSync(attachments[1]?.filePath ?? '') ?? '').not.toContain('"3"');
            expect(uploadedMessages(attachments)).toEqual(['1', '2', '3']);
        });

        it('keeps queued lines out of a stored attachment whose file is no longer the newest', async () => {
            const { storage } = createStorage({ maximumBreadcrumbs: 4 });
            storage.add(breadcrumb('1'));
            await settleWrites();
            const stored = storage.getAttachments();

            ['2', '3', '4', '5'].forEach((m) => storage.add(breadcrumb(m)));
            await settleWrites();
            storage.add(breadcrumb('6'));

            expect(stored.map((a) => a.get())).toEqual([undefined]);
        });

        it('keeps a burst of queued lines within the file limits', async () => {
            const { storage } = createStorage({ maximumBreadcrumbs: 4 });
            storage.add(breadcrumb('1'));
            await settleWrites();

            ['2', '3', '4', '5', '6'].forEach((m) => storage.add(breadcrumb(m)));

            expect(uploadedMessages(storage.getAttachments())).toEqual(['5', '6']);
        });

        it('does not upload a queued line that is too long to be written', async () => {
            const { fs, storage } = createStorage({ maximumTotalBreadcrumbsSize: 400 });
            storage.add(breadcrumb('small'));
            await settleWrites();

            storage.add(breadcrumb('x'.repeat(700)));
            const attachments = storage.getAttachments();

            expect(uploadedMessages(attachments)).toEqual(['small']);
            await settleWrites();
            expect(Object.values(fs.files).join('')).not.toContain('x'.repeat(700));
        });

        it('uploads queued lines before the first file exists', () => {
            const { storage } = createStorage({ maximumBreadcrumbs: 4 });
            storage.add(breadcrumb('1'));

            expect(uploadedMessages(storage.getAttachments())).toEqual(['1']);
        });
    });
});
