import { BreadcrumbLogLevel, BreadcrumbType } from '../../src/modules/breadcrumbs';
import { BreadcrumbsManager } from '../../src/modules/breadcrumbs/BreadcrumbsManager';

describe('Breadcrumbs filtering options tests', () => {
    describe('Event type tests', () => {
        it('Should filter out breadcrumbs based on the event type', () => {
            const message = 'test';
            const breadcrumbsManager = new BreadcrumbsManager({
                eventType: BreadcrumbType.Configuration,
            });

            const result = breadcrumbsManager.addBreadcrumb(message, BreadcrumbLogLevel.Debug, BreadcrumbType.Http);
            const breadcrumbs = JSON.parse(breadcrumbsManager.breadcrumbsStorage.get() as string);
            expect(result).toBeFalsy();
            expect(breadcrumbs.length).toEqual(0);
        });

        it('Should allow to add a breadcrumb with allowed event type', () => {
            const message = 'test';
            const allowedBreadcrumbType = BreadcrumbType.Configuration;
            const breadcrumbsManager = new BreadcrumbsManager({
                eventType: allowedBreadcrumbType,
            });

            const result = breadcrumbsManager.addBreadcrumb(message, BreadcrumbLogLevel.Debug, allowedBreadcrumbType);
            const [breadcrumb] = JSON.parse(breadcrumbsManager.breadcrumbsStorage.get() as string);
            expect(result).toBeTruthy();
            expect(breadcrumb.type).toEqual(BreadcrumbType[allowedBreadcrumbType].toLowerCase());
        });
    });

    describe('Log level tests', () => {
        it('Should filter out breadcrumbs based on the log level', () => {
            const message = 'test';
            const breadcrumbsManager = new BreadcrumbsManager({
                logLevel: BreadcrumbLogLevel.Error,
            });

            const result = breadcrumbsManager.addBreadcrumb(message, BreadcrumbLogLevel.Debug, BreadcrumbType.Http);
            const breadcrumbs = JSON.parse(breadcrumbsManager.breadcrumbsStorage.get() as string);
            expect(result).toBeFalsy();
            expect(breadcrumbs.length).toEqual(0);
        });

        it('Should allow to add a breadcrumb with allowed log level', () => {
            const message = 'test';
            const allowedLogLevel = BreadcrumbLogLevel.Debug;
            const breadcrumbsManager = new BreadcrumbsManager({
                logLevel: allowedLogLevel,
            });

            const result = breadcrumbsManager.addBreadcrumb(message, allowedLogLevel, BreadcrumbType.Http);
            const [breadcrumb] = JSON.parse(breadcrumbsManager.breadcrumbsStorage.get() as string);
            expect(result).toBeTruthy();
            expect(breadcrumb.level).toEqual(BreadcrumbLogLevel[allowedLogLevel].toLowerCase());
        });

        it('Should filter out warn breadcrumb if allowed log level is error or debug', () => {
            const message = 'test';
            const allowedLogLevel = BreadcrumbLogLevel.Debug | BreadcrumbLogLevel.Error;
            const breadcrumbsManager = new BreadcrumbsManager({
                logLevel: allowedLogLevel,
            });

            const result = breadcrumbsManager.warn(message);
            expect(result).toBeFalsy();
        });

        it('Should allow to store breadcrumb if user selected multiple log levels', () => {
            const message = 'test';
            const allowedLogLevel = BreadcrumbLogLevel.Debug | BreadcrumbLogLevel.Error;
            const breadcrumbsManager = new BreadcrumbsManager({
                logLevel: allowedLogLevel,
            });

            const result = breadcrumbsManager.error(message);
            expect(result).toBeTruthy();
        });
    });

    describe('Disabled breadcrumbs integration', () => {
        it('Should not accept breadcrumbs after breadcrumbs dispose', () => {
            const breadcrumbsManager = new BreadcrumbsManager();
            breadcrumbsManager.dispose();

            const result = breadcrumbsManager.error('test');
            expect(result).toBeFalsy();
        });
    });

    describe('Breadcrumbs overflow tests', () => {
        it('Should always store maximum breadcrumbs', () => {
            const maximumBreadcrumbs = 2;
            const breadcrumbsManager = new BreadcrumbsManager({
                maximumBreadcrumbs,
            });
            for (let index = 0; index < maximumBreadcrumbs; index++) {
                breadcrumbsManager.error(index.toString());
            }

            const addResult = breadcrumbsManager.addBreadcrumb(
                'after free space',
                BreadcrumbLogLevel.Debug,
                BreadcrumbType.Configuration,
            );
            const breadcrumbs = JSON.parse(breadcrumbsManager.breadcrumbsStorage.get() as string);

            expect(addResult).toBeTruthy();
            expect(breadcrumbs.length).toEqual(maximumBreadcrumbs);
        });

        it('Should drop the oldest event to free up the space for the new one', () => {
            const maximumBreadcrumbs = 2;
            const breadcrumbsManager = new BreadcrumbsManager({
                maximumBreadcrumbs,
            });
            const expectedBreadcrumbMessage = 'after free space';
            for (let index = 0; index < maximumBreadcrumbs; index++) {
                breadcrumbsManager.error(index.toString());
            }

            const addResult = breadcrumbsManager.addBreadcrumb(
                expectedBreadcrumbMessage,
                BreadcrumbLogLevel.Debug,
                BreadcrumbType.Configuration,
            );
            const breadcrumbs = JSON.parse(breadcrumbsManager.breadcrumbsStorage.get() as string);

            expect(addResult).toBeTruthy();
            expect(breadcrumbs[breadcrumbs.length - 1].message).toEqual(expectedBreadcrumbMessage);
        });
    });
});
