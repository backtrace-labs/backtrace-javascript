import { BreadcrumbLogLevel, BreadcrumbType } from '../../lib/modules/breadcrumbs';
import { BreadcrumbsManager } from '../../lib/modules/breadcrumbs/BreadcrumbsManager';

describe('Breadcrumbs creation tests', () => {
    describe('Last breadcrumb id attribute should be equal to last bredcrumb id in the array', () => {
        const breadcrumbsManager = new BreadcrumbsManager();
        breadcrumbsManager.info('test');

        const attributes = breadcrumbsManager.get();
        const [breadcrumb] = JSON.parse(breadcrumbsManager.breadcrumbsStorage.get() as string);

        expect(breadcrumb.id).toEqual(attributes[breadcrumbsManager.BREADCRUMB_ATTRIBUTE_NAME]);
    });

    it('Each breadcrumb should have different id', () => {
        const breadcrumbsManager = new BreadcrumbsManager();
        breadcrumbsManager.info('test');
        breadcrumbsManager.info('test2');

        const attachment = JSON.parse(breadcrumbsManager.breadcrumbsStorage.get() as string);

        expect(attachment[0].id).toBeLessThan(attachment[1].id);
    });

    it('Should update breadcrumb id every time after adding a breadcrumb', () => {
        const breadcrumbsManager = new BreadcrumbsManager();

        breadcrumbsManager.info('test');
        const attributes1 = breadcrumbsManager.get();
        breadcrumbsManager.info('test2');
        const attributes2 = breadcrumbsManager.get();

        expect(attributes1[breadcrumbsManager.BREADCRUMB_ATTRIBUTE_NAME] as number).toBeLessThan(
            attributes2[breadcrumbsManager.BREADCRUMB_ATTRIBUTE_NAME] as number,
        );
    });

    it('Should set expected breadcrumb message', () => {
        const message = 'test';
        const breadcrumbsManager = new BreadcrumbsManager();
        breadcrumbsManager.info(message);
        const [breadcrumb] = JSON.parse(breadcrumbsManager.breadcrumbsStorage.get() as string);

        expect(breadcrumb.message).toEqual(message);
    });

    it('Should set expected breadcrumb level', () => {
        const message = 'test';
        const level = BreadcrumbLogLevel.Warning;
        const breadcrumbsManager = new BreadcrumbsManager();
        breadcrumbsManager.log(message, level);
        const [breadcrumb] = JSON.parse(breadcrumbsManager.breadcrumbsStorage.get() as string);

        expect(breadcrumb.level).toEqual(BreadcrumbLogLevel[level].toLowerCase());
    });

    it('Should set expected breadcrumb type', () => {
        const message = 'test';
        const level = BreadcrumbLogLevel.Warning;
        const type = BreadcrumbType.Configuration;
        const breadcrumbsManager = new BreadcrumbsManager();
        breadcrumbsManager.addBreadcrumb(message, level, type);
        const [breadcrumb] = JSON.parse(breadcrumbsManager.breadcrumbsStorage.get() as string);

        expect(breadcrumb.type).toEqual(BreadcrumbType[type].toLowerCase());
    });

    it('Should include attributes if they are available', () => {
        const message = 'test';
        const level = BreadcrumbLogLevel.Warning;
        const attributes = { foo: 'bar', baz: 1 };
        const breadcrumbsManager = new BreadcrumbsManager();
        breadcrumbsManager.log(message, level, attributes);
        const [breadcrumb] = JSON.parse(breadcrumbsManager.breadcrumbsStorage.get() as string);

        expect(breadcrumb.attributes).toMatchObject(attributes);
    });
});
