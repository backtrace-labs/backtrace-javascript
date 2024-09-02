import { BreadcrumbsManager } from '../../src/modules/breadcrumbs/BreadcrumbsManager.js';
import { Breadcrumb } from '../../src/modules/breadcrumbs/model/Breadcrumb.js';
import { InMemoryBreadcrumbsStorage } from '../../src/modules/breadcrumbs/storage/InMemoryBreadcrumbsStorage.js';
describe('Breadcrumbs interceptor tests', () => {
    it('Should filter out the breadcrumb', () => {
        const storage = new InMemoryBreadcrumbsStorage(100);
        const breadcrumbsManager = new BreadcrumbsManager(
            {
                intercept: () => undefined,
            },
            {
                storage,
            },
        );
        breadcrumbsManager.initialize();

        breadcrumbsManager.info('test');
        const breadcrumbs = JSON.parse(storage.get() as string) as Breadcrumb[];
        expect(breadcrumbs.length).toBe(0);
    });

    it('Should remove pii information from breadcrumb', () => {
        const expectedBreadcrumbMessage = 'bar';
        const storage = new InMemoryBreadcrumbsStorage(100);
        const breadcrumbsManager = new BreadcrumbsManager(
            {
                intercept: (breadcrumb) => {
                    breadcrumb.message = expectedBreadcrumbMessage;
                    return breadcrumb;
                },
            },
            {
                storage,
            },
        );
        breadcrumbsManager.initialize();

        breadcrumbsManager.info('test');

        const [breadcrumb] = JSON.parse(storage.get() as string) as Breadcrumb[];
        expect(breadcrumb.message).toEqual(expectedBreadcrumbMessage);
    });
});
