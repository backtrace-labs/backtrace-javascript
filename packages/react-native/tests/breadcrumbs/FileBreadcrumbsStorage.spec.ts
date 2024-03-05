import { Breadcrumb, BreadcrumbLogLevel, BreadcrumbType, RawBreadcrumb } from '@backtrace/sdk-core';
import { MockedFileSystem } from '@backtrace/sdk-core/tests/_mocks/fileSystem';
import assert from 'assert';
import { promisify } from 'util';
import { FileSystem } from '../../src';
import { FileBreadcrumbsStorage } from '../../src/breadcrumbs/FileBreadcrumbsStorage';
import { FileLocation } from '../../src/types/FileLocation';
import { mockReactFileSystem } from '../_mocks/fileSystem';

function loadBreadcrumbs(fs: MockedFileSystem<FileSystem>, location: FileLocation): Breadcrumb[] {
    return fs
        .readFileSync(location.filepath)
        .split('\n')
        .filter((n) => !!n)
        .map((x) => {
            try {
                return JSON.parse(x);
            } catch (err) {
                throw new Error(`failed to parse "${x}": ${err}`);
            }
        });
}

const nextTick = promisify(process.nextTick);

describe('FileBreadcrumbsStorage', () => {
    it('should return added breadcrumbs', async () => {
        const fs = mockReactFileSystem();

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

        const storage = new FileBreadcrumbsStorage(fs, 'breadcrumbs-1', 'breadcrumbs-2', {
            maximumBreadcrumbs: 100,
        });

        for (const breadcrumb of breadcrumbs) {
            storage.add(breadcrumb);
        }

        // FileBreadcrumbsStorage is asynchronous in nature
        await nextTick();

        const [mainAttachment] = storage.getAttachments();

        const mainLocation = mainAttachment.get();
        assert(mainLocation);

        const actualMain = loadBreadcrumbs(fs, mainLocation);
        expect(actualMain).toEqual(expectedMain);
    });

    it('should return added breadcrumbs in two attachments', async () => {
        const fs = mockReactFileSystem();

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

        const storage = new FileBreadcrumbsStorage(fs, 'breadcrumbs-1', 'breadcrumbs-2', {
            maximumBreadcrumbs: 4,
        });

        for (const breadcrumb of breadcrumbs) {
            storage.add(breadcrumb);
        }

        // FileBreadcrumbsStorage is asynchronous in nature
        await nextTick();

        const [mainAttachment, fallbackAttachment] = storage.getAttachments();

        const mainLocation = mainAttachment.get();
        const fallbackLocation = fallbackAttachment.get();
        assert(mainLocation);
        assert(fallbackLocation);

        const actualMain = loadBreadcrumbs(fs, mainLocation);
        const actualFallback = loadBreadcrumbs(fs, fallbackLocation);
        expect(actualMain).toEqual(expectedMain);
        expect(actualFallback).toEqual(expectedFallback);
    });

    it('should return no more than maximumBreadcrumbs breadcrumbs', async () => {
        const fs = mockReactFileSystem();

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
                level: 'debug',
                message: 'b',
                timestamp: expect.any(Number),
                type: 'http',
            },
        ];

        const storage = new FileBreadcrumbsStorage(fs, 'breadcrumbs-1', 'breadcrumbs-2', {
            maximumBreadcrumbs: 2,
        });

        for (const breadcrumb of breadcrumbs) {
            storage.add(breadcrumb);
        }

        // FileBreadcrumbsStorage is asynchronous in nature
        await nextTick();

        const [mainAttachment, fallbackAttachment] = storage.getAttachments();

        const mainLocation = mainAttachment.get();
        const fallbackLocation = fallbackAttachment.get();
        assert(mainLocation);
        assert(fallbackLocation);

        const actualMain = loadBreadcrumbs(fs, mainLocation);
        const actualFallback = loadBreadcrumbs(fs, fallbackLocation);
        expect(actualMain).toEqual(expectedMain);
        expect(actualFallback).toEqual(expectedFallback);
    });

    it('should return breadcrumbs up to the json size', async () => {
        const fs = mockReactFileSystem();

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

        const storage = new FileBreadcrumbsStorage(fs, 'breadcrumbs-1', 'breadcrumbs-2', {
            maximumBreadcrumbs: 100,
            maximumBreadcrumbsSize: JSON.stringify(expectedMain[0]).length + 10,
        });

        for (const breadcrumb of breadcrumbs) {
            storage.add(breadcrumb);
        }

        // FileBreadcrumbsStorage is asynchronous in nature
        await nextTick();

        const [mainAttachment, fallbackAttachment] = storage.getAttachments();

        const mainLocation = mainAttachment.get();
        const fallbackLocation = fallbackAttachment.get();
        assert(mainLocation);
        assert(fallbackLocation);

        const actualMain = loadBreadcrumbs(fs, mainLocation);
        const actualFallback = loadBreadcrumbs(fs, fallbackLocation);
        expect(actualMain).toEqual(expectedMain);
        expect(actualFallback).toEqual(expectedFallback);
    });
});
