import { BreadcrumbsManager } from '../../src/modules/breadcrumbs/BreadcrumbsManager';
import { Breadcrumb } from '../../src/modules/breadcrumbs/model/Breadcrumb';
import { InMemoryBreadcrumbsStorage } from '../../src/modules/breadcrumbs/storage/InMemoryBreadcrumbsStorage';
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
        breadcrumbsManager.info('test');

        const [breadcrumb] = JSON.parse(storage.get() as string) as Breadcrumb[];
        expect(breadcrumb.message).toEqual(expectedBreadcrumbMessage);
    });
});
