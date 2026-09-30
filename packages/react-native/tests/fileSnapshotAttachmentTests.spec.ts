import { BreadcrumbLogLevel, BreadcrumbType, SessionFiles, type RawBreadcrumb } from '@backtrace/sdk-core';
import assert from 'assert';
import { Platform } from 'react-native';
import ReactNativeFormData from 'react-native/Libraries/Network/FormData';
import { promisify } from 'util';
import { FileSnapshotAttachment } from '../src/attachment/FileSnapshotAttachment';
import { FileBreadcrumbsStorage } from '../src/breadcrumbs/FileBreadcrumbsStorage';
import { ReactNativeRequestHandler } from '../src/ReactNativeRequestHandler';
import { mockStreamFileSystem } from './_mocks/fileSystem';

const nextTick = promisify(process.nextTick);
const filePath = '/breadcrumbs/bt-breadcrumbs-0';
const submissionUrl = 'https://submit.backtrace.io/test/token/json';

function breadcrumb(message: string): RawBreadcrumb {
    return { message, level: BreadcrumbLogLevel.Info, type: BreadcrumbType.Manual };
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
});
