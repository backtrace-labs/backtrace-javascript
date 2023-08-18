import { BreadcrumbsManager } from '../../src/modules/breadcrumbs/BreadcrumbsManager';
import { Breadcrumb } from '../../src/modules/breadcrumbs/model/Breadcrumb';
describe('Breadcrumbs interceptor tests', () => {
    it('Should filter out the breadcrumb', () => {
        const breadcrumbsManager = new BreadcrumbsManager({
            intercept: () => undefined,
        });
        breadcrumbsManager.info('test');
        const breadcrumbs = JSON.parse(breadcrumbsManager.breadcrumbsStorage.get() as string) as Breadcrumb[];
        expect(breadcrumbs.length).toBe(0);
    });

    it('Should remove pii information from breadcrumb', () => {
        const expectedBreadcrumbMessage = 'bar';
        const breadcrumbsManager = new BreadcrumbsManager({
            intercept: (breadcrumb) => {
                breadcrumb.message = expectedBreadcrumbMessage;
                return breadcrumb;
            },
        });
        breadcrumbsManager.info('test');

        const [breadcrumb] = JSON.parse(breadcrumbsManager.breadcrumbsStorage.get() as string) as Breadcrumb[];
        expect(breadcrumb.message).toEqual(expectedBreadcrumbMessage);
    });
});
