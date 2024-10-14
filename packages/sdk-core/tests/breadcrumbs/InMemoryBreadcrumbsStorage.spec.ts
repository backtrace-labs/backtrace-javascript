import { Breadcrumb, BreadcrumbLogLevel, BreadcrumbType, RawBreadcrumb } from '../../src/index.js';
import { InMemoryBreadcrumbsStorage } from '../../src/modules/breadcrumbs/storage/InMemoryBreadcrumbsStorage.js';

describe('InMemoryBreadcrumbsStorage', () => {
    it('should return added breadcrumbs', () => {
        const storage = new InMemoryBreadcrumbsStorage({
            maximumBreadcrumbs: 100,
        });

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

        const expected: Breadcrumb[] = [
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

        for (const breadcrumb of breadcrumbs) {
            storage.add(breadcrumb);
        }

        const actual = JSON.parse(storage.get());
        expect(actual).toEqual(expected);
    });

    it('should return no more than maximumBreadcrumbs breadcrumbs', () => {
        const storage = new InMemoryBreadcrumbsStorage({
            maximumBreadcrumbs: 2,
        });

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

        const expected: Breadcrumb[] = [
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

        for (const breadcrumb of breadcrumbs) {
            storage.add(breadcrumb);
        }

        const actual = JSON.parse(storage.get());
        expect(actual).toEqual(expected);
    });

    it('should return breadcrumbs up to the json size', () => {
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

        const expected: Breadcrumb[] = [
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

        const size = JSON.stringify(expected).length;
        const storage = new InMemoryBreadcrumbsStorage({
            maximumBreadcrumbs: 100,
            maximumTotalBreadcrumbsSize: size,
        });

        for (const breadcrumb of breadcrumbs) {
            storage.add(breadcrumb);
        }

        const actual = JSON.parse(storage.get());
        expect(actual).toEqual(expected);
    });
});
