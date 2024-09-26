import { BreadcrumbsManager } from '../../src/modules/breadcrumbs/BreadcrumbsManager.js';
import { BreadcrumbLogLevel, BreadcrumbType } from '../../src/modules/breadcrumbs/index.js';
import { InMemoryBreadcrumbsStorage } from '../../src/modules/breadcrumbs/storage/InMemoryBreadcrumbsStorage.js';

describe('Breadcrumbs creation tests', () => {
    it('Last breadcrumb id attribute should be equal to last bredcrumb id in the array', () => {
        const storage = new InMemoryBreadcrumbsStorage({ maximumBreadcrumbs: 100 });
        storage.add({ level: BreadcrumbLogLevel.Info, message: 'test', type: BreadcrumbType.Manual });

        const lastBreadcrumbId = storage.lastBreadcrumbId;
        const [breadcrumb] = JSON.parse(storage.get() as string);

        expect(breadcrumb.id).toEqual(lastBreadcrumbId);
    });

    it('Each breadcrumb should have different id', () => {
        const storage = new InMemoryBreadcrumbsStorage({ maximumBreadcrumbs: 100 });
        const breadcrumbsManager = new BreadcrumbsManager(undefined, { storage: () => storage });
        breadcrumbsManager.initialize();
        breadcrumbsManager.info('test');
        breadcrumbsManager.info('test2');

        const attachment = JSON.parse(storage.get() as string);

        expect(attachment[0].id).toBeLessThan(attachment[1].id);
    });

    it('Should update breadcrumb id every time after adding a breadcrumb', () => {
        const storage = new InMemoryBreadcrumbsStorage({ maximumBreadcrumbs: 100 });

        storage.add({ level: BreadcrumbLogLevel.Info, message: 'test', type: BreadcrumbType.Manual });
        const breadcrumbId1 = storage.lastBreadcrumbId;
        storage.add({ level: BreadcrumbLogLevel.Info, message: 'test', type: BreadcrumbType.Manual });
        const breadcrumbId2 = storage.lastBreadcrumbId;

        expect(breadcrumbId1).toBeLessThan(breadcrumbId2);
    });

    it('Should set expected breadcrumb message', () => {
        const message = 'test';
        const storage = new InMemoryBreadcrumbsStorage({ maximumBreadcrumbs: 100 });
        const breadcrumbsManager = new BreadcrumbsManager(undefined, { storage: () => storage });
        breadcrumbsManager.initialize();
        breadcrumbsManager.info(message);
        const [breadcrumb] = JSON.parse(storage.get() as string);

        expect(breadcrumb.message).toEqual(message);
    });

    it('Should convert number to string and treat it as a breadcrumb message', () => {
        const input = 1;
        const expectedBreadcrumbValueOutput = input.toString();

        const storage = new InMemoryBreadcrumbsStorage({ maximumBreadcrumbs: 100 });
        const breadcrumbsManager = new BreadcrumbsManager(undefined, { storage: () => storage });
        breadcrumbsManager.initialize();
        breadcrumbsManager.info(input as unknown as string);
        const [breadcrumb] = JSON.parse(storage.get() as string);

        expect(breadcrumb.message).toEqual(expectedBreadcrumbValueOutput);
    });

    it('Should convert object to JSON and treat it as a breadcrumb message', () => {
        const input = { foo: 1, bar: true, baz: undefined };
        const expectedBreadcrumbValueOutput = JSON.stringify(input);

        const storage = new InMemoryBreadcrumbsStorage({ maximumBreadcrumbs: 100 });
        const breadcrumbsManager = new BreadcrumbsManager(undefined, { storage: () => storage });
        breadcrumbsManager.initialize();
        breadcrumbsManager.info(input as unknown as string);
        const [breadcrumb] = JSON.parse(storage.get() as string);

        expect(breadcrumb.message).toEqual(expectedBreadcrumbValueOutput);
    });

    it('Should correctly handle null breadcrumb value', () => {
        const input = null;
        const expectedBreadcrumbValueOutput = '';

        const storage = new InMemoryBreadcrumbsStorage({ maximumBreadcrumbs: 100 });
        const breadcrumbsManager = new BreadcrumbsManager(undefined, { storage: () => storage });
        breadcrumbsManager.initialize();
        breadcrumbsManager.info(input as unknown as string);
        const [breadcrumb] = JSON.parse(storage.get() as string);

        expect(breadcrumb.message).toEqual(expectedBreadcrumbValueOutput);
    });

    it('Should set expected breadcrumb level', () => {
        const message = 'test';
        const level = BreadcrumbLogLevel.Warning;
        const storage = new InMemoryBreadcrumbsStorage({ maximumBreadcrumbs: 100 });
        const breadcrumbsManager = new BreadcrumbsManager(undefined, { storage: () => storage });
        breadcrumbsManager.initialize();
        breadcrumbsManager.log(message, level);
        const [breadcrumb] = JSON.parse(storage.get() as string);

        expect(breadcrumb.level).toEqual(BreadcrumbLogLevel[level].toLowerCase());
    });

    it('Should set expected breadcrumb type', () => {
        const message = 'test';
        const level = BreadcrumbLogLevel.Warning;
        const type = BreadcrumbType.Configuration;
        const storage = new InMemoryBreadcrumbsStorage({ maximumBreadcrumbs: 100 });
        const breadcrumbsManager = new BreadcrumbsManager(undefined, { storage: () => storage });
        breadcrumbsManager.initialize();
        breadcrumbsManager.addBreadcrumb(message, level, type);
        const [breadcrumb] = JSON.parse(storage.get() as string);

        expect(breadcrumb.type).toEqual(BreadcrumbType[type].toLowerCase());
    });

    it('Should include attributes if they are available', () => {
        const message = 'test';
        const level = BreadcrumbLogLevel.Warning;
        const attributes = { foo: 'bar', baz: 1 };
        const storage = new InMemoryBreadcrumbsStorage({ maximumBreadcrumbs: 100 });
        const breadcrumbsManager = new BreadcrumbsManager(undefined, { storage: () => storage });
        breadcrumbsManager.initialize();
        breadcrumbsManager.log(message, level, attributes);
        const [breadcrumb] = JSON.parse(storage.get() as string);

        expect(breadcrumb.attributes).toMatchObject(attributes);
    });
});
