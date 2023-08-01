import { BreadcrumbLogLevel, BreadcrumbType } from '../../lib/modules/breadcrumbs';
import { BreadcrumbManager } from '../../lib/modules/breadcrumbs/BreadcrumbManager';

describe('Breadcrumbs filtering options tests', () => {
    describe('Event type tests', () => {
        it('Should filter out breadcrumbs based on the event type', () => {
            const message = 'test';
            const breadcrumbManager = new BreadcrumbManager({
                eventType: BreadcrumbType.Configuration,
            });

            const result = breadcrumbManager.addBreadcrumb(message, BreadcrumbLogLevel.Debug, BreadcrumbType.Http);
            const breadcrumbs = JSON.parse(breadcrumbManager.breadcrumbStorage.get() as string);
            expect(result).toBeFalsy();
            expect(breadcrumbs.length).toEqual(0);
        });

        it('Should allow to add a breadcrumb with allowed event type', () => {
            const message = 'test';
            const allowedBreadcrumbType = BreadcrumbType.Configuration;
            const breadcrumbManager = new BreadcrumbManager({
                eventType: allowedBreadcrumbType,
            });

            const result = breadcrumbManager.addBreadcrumb(message, BreadcrumbLogLevel.Debug, allowedBreadcrumbType);
            const [breadcrumb] = JSON.parse(breadcrumbManager.breadcrumbStorage.get() as string);
            expect(result).toBeTruthy();
            expect(breadcrumb.type).toEqual(BreadcrumbType[allowedBreadcrumbType].toLowerCase());
        });
    });

    describe('Log level tests', () => {
        it('Should filter out breadcrumbs based on the log level', () => {
            const message = 'test';
            const breadcrumbManager = new BreadcrumbManager({
                logLevel: BreadcrumbLogLevel.Error,
            });

            const result = breadcrumbManager.addBreadcrumb(message, BreadcrumbLogLevel.Debug, BreadcrumbType.Http);
            const breadcrumbs = JSON.parse(breadcrumbManager.breadcrumbStorage.get() as string);
            expect(result).toBeFalsy();
            expect(breadcrumbs.length).toEqual(0);
        });

        it('Should allow to add a breadcrumb with allowed log level', () => {
            const message = 'test';
            const allowedLogLevel = BreadcrumbLogLevel.Debug;
            const breadcrumbManager = new BreadcrumbManager({
                logLevel: allowedLogLevel,
            });

            const result = breadcrumbManager.addBreadcrumb(message, allowedLogLevel, BreadcrumbType.Http);
            const [breadcrumb] = JSON.parse(breadcrumbManager.breadcrumbStorage.get() as string);
            expect(result).toBeTruthy();
            expect(breadcrumb.level).toEqual(BreadcrumbLogLevel[allowedLogLevel].toLowerCase());
        });

        it('Should filter out warn breadcrumb if allowed log level is error or debug', () => {
            const message = 'test';
            const allowedLogLevel = BreadcrumbLogLevel.Debug | BreadcrumbLogLevel.Error;
            const breadcrumbManager = new BreadcrumbManager({
                logLevel: allowedLogLevel,
            });

            const result = breadcrumbManager.warn(message);
            expect(result).toBeFalsy();
        });

        it('Should allow to store breadcrumb if user selected multiple log levels', () => {
            const message = 'test';
            const allowedLogLevel = BreadcrumbLogLevel.Debug | BreadcrumbLogLevel.Error;
            const breadcrumbManager = new BreadcrumbManager({
                logLevel: allowedLogLevel,
            });

            const result = breadcrumbManager.error(message);
            expect(result).toBeTruthy();
        });
    });

    describe('Disabled breadcrumbs integration', () => {
        it('Should not accept breadcrumbs after breadcrumbs dispose', () => {
            const breadcrumbManager = new BreadcrumbManager();
            breadcrumbManager.dispose();

            const result = breadcrumbManager.error('test');
            expect(result).toBeFalsy();
        });
    });

    describe('Breadcrumbs overflow tests', () => {
        it('Should always store maximum breadcrumbs', () => {
            const maximumBreadcrumbs = 2;
            const breadcrumbManager = new BreadcrumbManager({
                maximumBreadcrumbs,
            });
            for (let index = 0; index < maximumBreadcrumbs; index++) {
                breadcrumbManager.error(index.toString());
            }

            const addResult = breadcrumbManager.addBreadcrumb(
                'after free space',
                BreadcrumbLogLevel.Debug,
                BreadcrumbType.Configuration,
            );
            const breadcrumbs = JSON.parse(breadcrumbManager.breadcrumbStorage.get() as string);

            expect(addResult).toBeTruthy();
            expect(breadcrumbs.length).toEqual(maximumBreadcrumbs);
        });

        it('Should drop the oldest event to free up the space for the new one', () => {
            const maximumBreadcrumbs = 2;
            const breadcrumbManager = new BreadcrumbManager({
                maximumBreadcrumbs,
            });
            const expectedBreadcrumbMessage = 'after free space';
            for (let index = 0; index < maximumBreadcrumbs; index++) {
                breadcrumbManager.error(index.toString());
            }

            const addResult = breadcrumbManager.addBreadcrumb(
                expectedBreadcrumbMessage,
                BreadcrumbLogLevel.Debug,
                BreadcrumbType.Configuration,
            );
            const breadcrumbs = JSON.parse(breadcrumbManager.breadcrumbStorage.get() as string);

            expect(addResult).toBeTruthy();
            expect(breadcrumbs[breadcrumbs.length - 1].message).toEqual(expectedBreadcrumbMessage);
        });
    });
});
