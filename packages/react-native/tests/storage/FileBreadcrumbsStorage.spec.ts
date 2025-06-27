import { Breadcrumb, BreadcrumbLogLevel, BreadcrumbType, RawBreadcrumb, SessionFiles } from '@backtrace/sdk-core';
import { MockedBacktraceStorage } from '@backtrace/sdk-core/tests/_mocks/storage';
import assert from 'assert';
import { promisify } from 'util';
import { BacktraceStorageModule } from '../../src';
import { FileBreadcrumbsStorage } from '../../src/breadcrumbs/FileBreadcrumbsStorage';
import { FileLocation } from '../../src/types/FileLocation';
import { mockStreamFileSystem } from '../_mocks/fileSystem';

async function loadBreadcrumbs(
    fs: MockedBacktraceStorage<Omit<BacktraceStorageModule, 'bind'>>,
    location: FileLocation,
): Promise<Breadcrumb[]> {
    return (
        (await fs.get(location.filepath))
            ?.split('\n')
            .filter((n) => !!n)
            .map((x) => {
                try {
                    return JSON.parse(x);
                } catch (err) {
                    throw new Error(`failed to parse "${x}": ${err}`);
                }
            }) ?? []
    );
}

const nextTick = promisify(process.nextTick);

describe('FileBreadcrumbsStorage', () => {
    it('should return added breadcrumbs', async () => {
        const fs = mockStreamFileSystem();
        const session = new SessionFiles(fs, 'sessionId');

        const breadcrumbs: RawBreadcrumb[] = [
            {
                level: BreadcrumbLogLevel.Info,
                message: 'a',
                type: BreadcrumbType.Manual,
                attributes: {
                    foo: 'bar',
                },
            },
            {
                level: BreadcrumbLogLevel.Debug,
                message: 'b',
                type: BreadcrumbType.Http,
            },
            {
                level: BreadcrumbLogLevel.Warning,
                message: 'c',
                type: BreadcrumbType.Navigation,
                attributes: {},
            },
        ];

        const expectedMain: Breadcrumb[] = [
            {
                id: expect.any(Number),
                level: 'info',
                message: 'a',
                timestamp: expect.any(Number),
                type: 'manual',
                attributes: {
                    foo: 'bar',
                },
            },
            {
                id: expect.any(Number),
                level: 'debug',
                message: 'b',
                timestamp: expect.any(Number),
                type: 'http',
            },
            {
                id: expect.any(Number),
                level: 'warning',
                message: 'c',
                timestamp: expect.any(Number),
                type: 'navigation',
                attributes: {},
            },
        ];

        const storage = new FileBreadcrumbsStorage(session, fs, {
            maximumBreadcrumbs: 100,
        });

        for (const breadcrumb of breadcrumbs) {
            storage.add(breadcrumb);
        }

        // FileBreadcrumbsStorage is asynchronous in nature
        await nextTick();

        const [mainAttachment] = storage.getAttachments();

        const mainStream = mainAttachment.get();
        assert(mainStream);

        const actualMain = await loadBreadcrumbs(fs, mainStream);
        expect(actualMain).toEqual(expectedMain);
    });

    it('should return added breadcrumbs in two attachments', async () => {
        const fs = mockStreamFileSystem();
        const session = new SessionFiles(fs, 'sessionId');

        const breadcrumbs: RawBreadcrumb[] = [
            {
                level: BreadcrumbLogLevel.Info,
                message: 'a',
                type: BreadcrumbType.Manual,
                attributes: {
                    foo: 'bar',
                },
            },
            {
                level: BreadcrumbLogLevel.Debug,
                message: 'b',
                type: BreadcrumbType.Http,
            },
            {
                level: BreadcrumbLogLevel.Warning,
                message: 'c',
                type: BreadcrumbType.Navigation,
                attributes: {},
            },
        ];

        const expectedMain: Breadcrumb[] = [
            {
                id: expect.any(Number),
                level: 'warning',
                message: 'c',
                timestamp: expect.any(Number),
                type: 'navigation',
                attributes: {},
            },
        ];

        const expectedFallback: Breadcrumb[] = [
            {
                id: expect.any(Number),
                level: 'info',
                message: 'a',
                timestamp: expect.any(Number),
                type: 'manual',
                attributes: {
                    foo: 'bar',
                },
            },
            {
                id: expect.any(Number),
                level: 'debug',
                message: 'b',
                timestamp: expect.any(Number),
                type: 'http',
            },
        ];

        const storage = new FileBreadcrumbsStorage(session, fs, {
            maximumBreadcrumbs: 4,
        });

        for (const breadcrumb of breadcrumbs) {
            storage.add(breadcrumb);
            await nextTick();
        }

        // FileBreadcrumbsStorage is asynchronous in nature
        await nextTick();

        const [fallbackAttachment, mainAttachment] = storage.getAttachments();

        const mainStream = mainAttachment.get();
        const fallbackStream = fallbackAttachment.get();
        assert(mainStream);
        assert(fallbackStream);

        const actualMain = await loadBreadcrumbs(fs, mainStream);
        const actualFallback = await loadBreadcrumbs(fs, fallbackStream);
        expect(actualMain).toEqual(expectedMain);
        expect(actualFallback).toEqual(expectedFallback);
    });

    it('should return no more than maximumBreadcrumbs breadcrumbs', async () => {
        const fs = mockStreamFileSystem();
        const session = new SessionFiles(fs, 'sessionId');

        const breadcrumbs: RawBreadcrumb[] = [
            {
                level: BreadcrumbLogLevel.Info,
                message: 'a\n1',
                type: BreadcrumbType.Manual,
                attributes: {
                    foo: 'bar',
                },
            },
            {
                level: BreadcrumbLogLevel.Debug,
                message: 'b\n2',
                type: BreadcrumbType.Http,
            },
            {
                level: BreadcrumbLogLevel.Warning,
                message: 'c\n3',
                type: BreadcrumbType.Navigation,
                attributes: {},
            },
        ];

        const expectedMain: Breadcrumb[] = [
            {
                id: expect.any(Number),
                level: 'warning',
                message: 'c\n3',
                timestamp: expect.any(Number),
                type: 'navigation',
                attributes: {},
            },
        ];

        const expectedFallback: Breadcrumb[] = [
            {
                id: expect.any(Number),
                level: 'debug',
                message: 'b\n2',
                timestamp: expect.any(Number),
                type: 'http',
            },
        ];

        const storage = new FileBreadcrumbsStorage(session, fs, {
            maximumBreadcrumbs: 2,
        });

        for (const breadcrumb of breadcrumbs) {
            storage.add(breadcrumb);
            await nextTick();
        }

        // FileBreadcrumbsStorage is asynchronous in nature
        await nextTick();

        const [fallbackAttachment, mainAttachment] = storage.getAttachments();

        const mainStream = mainAttachment.get();
        const fallbackStream = fallbackAttachment.get();
        assert(mainStream);
        assert(fallbackStream);

        const actualMain = await loadBreadcrumbs(fs, mainStream);
        const actualFallback = await loadBreadcrumbs(fs, fallbackStream);
        expect(actualMain).toEqual(expectedMain);
        expect(actualFallback).toEqual(expectedFallback);
    });

    it('should return breadcrumbs up to the json size', async () => {
        const fs = mockStreamFileSystem();
        const session = new SessionFiles(fs, 'sessionId');

        const breadcrumbs: RawBreadcrumb[] = [
            {
                level: BreadcrumbLogLevel.Debug,
                message: 'a',
                type: BreadcrumbType.Http,
            },
            {
                level: BreadcrumbLogLevel.Debug,
                message: 'b',
                type: BreadcrumbType.Http,
            },
            {
                level: BreadcrumbLogLevel.Debug,
                message: 'c',
                type: BreadcrumbType.Http,
            },
        ];

        const expectedMain: Breadcrumb[] = [
            {
                id: expect.any(Number),
                level: 'debug',
                message: 'c',
                timestamp: expect.any(Number),
                type: 'http',
            },
        ];

        const expectedFallback: Breadcrumb[] = [
            {
                id: expect.any(Number),
                level: 'debug',
                message: 'b',
                timestamp: expect.any(Number),
                type: 'http',
            },
        ];

        const storage = new FileBreadcrumbsStorage(session, fs, {
            maximumBreadcrumbs: 100,
            maximumTotalBreadcrumbsSize:
                JSON.stringify(expectedMain[0]).length + JSON.stringify(expectedFallback[0]).length + 10,
        });

        for (const breadcrumb of breadcrumbs) {
            storage.add(breadcrumb);
            await nextTick();
        }

        // FileBreadcrumbsStorage is asynchronous in nature
        await nextTick();

        const [fallbackAttachment, mainAttachment] = storage.getAttachments();

        const mainStream = mainAttachment?.get();
        const fallbackStream = fallbackAttachment?.get();
        assert(mainStream);
        assert(fallbackStream);

        const actualMain = await loadBreadcrumbs(fs, mainStream);
        const actualFallback = await loadBreadcrumbs(fs, fallbackStream);
        expect(actualMain).toEqual(expectedMain);
        expect(actualFallback).toEqual(expectedFallback);
    });

    it('should return attachments with a valid name from getAttachments', async () => {
        const fs = mockStreamFileSystem();
        const session = new SessionFiles(fs, 'sessionId');

        const breadcrumbs: RawBreadcrumb[] = [
            {
                level: BreadcrumbLogLevel.Info,
                message: 'a',
                type: BreadcrumbType.Manual,
                attributes: {
                    foo: 'bar',
                },
            },
            {
                level: BreadcrumbLogLevel.Debug,
                message: 'b',
                type: BreadcrumbType.Http,
            },
            {
                level: BreadcrumbLogLevel.Warning,
                message: 'c',
                type: BreadcrumbType.Navigation,
                attributes: {},
            },
        ];

        const storage = new FileBreadcrumbsStorage(session, fs, {
            maximumBreadcrumbs: 4,
        });

        for (const breadcrumb of breadcrumbs) {
            storage.add(breadcrumb);
            await nextTick();
        }

        // FileBreadcrumbsStorage is asynchronous in nature
        await nextTick();

        const [fallbackAttachment, mainAttachment] = storage.getAttachments();

        expect(fallbackAttachment.name).toEqual(expect.stringMatching(/^bt-breadcrumbs-0/));
        expect(mainAttachment.name).toEqual(expect.stringMatching(/^bt-breadcrumbs-1/));
    });

    it('should return attachments with a valid name from getAttachmentProviders', async () => {
        const fs = mockStreamFileSystem();
        const session = new SessionFiles(fs, 'sessionId');

        const breadcrumbs: RawBreadcrumb[] = [
            {
                level: BreadcrumbLogLevel.Info,
                message: 'a',
                type: BreadcrumbType.Manual,
                attributes: {
                    foo: 'bar',
                },
            },
            {
                level: BreadcrumbLogLevel.Debug,
                message: 'b',
                type: BreadcrumbType.Http,
            },
            {
                level: BreadcrumbLogLevel.Warning,
                message: 'c',
                type: BreadcrumbType.Navigation,
                attributes: {},
            },
        ];

        const storage = new FileBreadcrumbsStorage(session, fs, {
            maximumBreadcrumbs: 4,
        });

        for (const breadcrumb of breadcrumbs) {
            storage.add(breadcrumb);
            await nextTick();
        }

        // FileBreadcrumbsStorage is asynchronous in nature
        await nextTick();

        const providers = storage.getAttachmentProviders();

        const [fallbackAttachment, mainAttachment] = providers
            .map((v) => v.get())
            .map((v) => (Array.isArray(v) ? v : [v]))
            .filter((f) => !!f)
            .reduce((acc, arr) => [...acc, ...arr], []);

        expect(fallbackAttachment?.name).toEqual(expect.stringMatching(/^bt-breadcrumbs-0/));
        expect(mainAttachment?.name).toEqual(expect.stringMatching(/^bt-breadcrumbs-1/));
    });
});
