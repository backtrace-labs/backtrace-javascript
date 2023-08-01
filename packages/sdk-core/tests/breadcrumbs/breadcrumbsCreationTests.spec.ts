import { BreadcrumbLogLevel, BreadcrumbType } from '../../lib/modules/breadcrumbs';
import { BreadcrumbManager } from '../../lib/modules/breadcrumbs/BreadcrumbManager';

describe('Breadcrumbs creation tests', () => {
    describe('Last breadcrumb id attribute should be equal to last bredcrumb id in the array', () => {
        const breadcrumbManager = new BreadcrumbManager();
        breadcrumbManager.info('test');

        const attributes = breadcrumbManager.get();
        const [breadcrumb] = JSON.parse(breadcrumbManager.breadcrumbStorage.get() as string);

        expect(breadcrumb.id).toEqual(attributes[breadcrumbManager.BREADCRUMB_ATTRIBUTE_NAME]);
    });

    it('Each breadcrumb should have different id', () => {
        const breadcrumbManager = new BreadcrumbManager();
        breadcrumbManager.info('test');
        breadcrumbManager.info('test2');

        const attachment = JSON.parse(breadcrumbManager.breadcrumbStorage.get() as string);

        expect(attachment[0].id).toBeLessThan(attachment[1].id);
    });

    it('Should update breadcrumb id every time after adding a breadcrumb', () => {
        const breadcrumbManager = new BreadcrumbManager();

        breadcrumbManager.info('test');
        const attributes1 = breadcrumbManager.get();
        breadcrumbManager.info('test2');
        const attributes2 = breadcrumbManager.get();

        expect(attributes1[breadcrumbManager.BREADCRUMB_ATTRIBUTE_NAME] as number).toBeLessThan(
            attributes2[breadcrumbManager.BREADCRUMB_ATTRIBUTE_NAME] as number,
        );
    });

    it('Should set expected breadcrumb message', () => {
        const message = 'test';
        const breadcrumbManager = new BreadcrumbManager();
        breadcrumbManager.info(message);
        const [breadcrumb] = JSON.parse(breadcrumbManager.breadcrumbStorage.get() as string);

        expect(breadcrumb.message).toEqual(message);
    });

    it('Should set expected breadcrumb level', () => {
        const message = 'test';
        const level = BreadcrumbLogLevel.Warning;
        const breadcrumbManager = new BreadcrumbManager();
        breadcrumbManager.log(message, level);
        const [breadcrumb] = JSON.parse(breadcrumbManager.breadcrumbStorage.get() as string);

        expect(breadcrumb.level).toEqual(BreadcrumbLogLevel[level].toLowerCase());
    });

    it('Should set expected breadcrumb type', () => {
        const message = 'test';
        const level = BreadcrumbLogLevel.Warning;
        const type = BreadcrumbType.Configuration;
        const breadcrumbManager = new BreadcrumbManager();
        breadcrumbManager.addBreadcrumb(message, level, type);
        const [breadcrumb] = JSON.parse(breadcrumbManager.breadcrumbStorage.get() as string);

        expect(breadcrumb.type).toEqual(BreadcrumbType[type].toLowerCase());
    });

    it('Should include attributes if they are available', () => {
        const message = 'test';
        const level = BreadcrumbLogLevel.Warning;
        const attributes = { foo: 'bar', baz: 1 };
        const breadcrumbManager = new BreadcrumbManager();
        breadcrumbManager.log(message, level, attributes);
        const [breadcrumb] = JSON.parse(breadcrumbManager.breadcrumbStorage.get() as string);

        expect(breadcrumb.attributes).toMatchObject(attributes);
    });
});
