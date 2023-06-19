import { TimeHelper } from '../../src/common/TimeHelper';
import { RateLimitWatcher } from '../../src/modules/rateLimiter/RateLimitWatcher';
describe('Report Limit Watcher tests', () => {
    describe('Disabled rate limit watcher', () => {
        it('Should disable limit watcher when the report limit is set to 0', () => {
            const rateLimitWatcher = new RateLimitWatcher(0);
            expect(rateLimitWatcher.enabled).toBeFalsy();
        });

        it(`Skip report method should always return false for disabled rate limiter`, () => {
            const rateLimitWatcher = new RateLimitWatcher(0);
            expect(rateLimitWatcher.skipReport()).toBeFalsy();
        });

        it('Should disable rate limit watcher on undefined options', () => {
            const rateLimitWatcher = new RateLimitWatcher(undefined);
            expect(rateLimitWatcher.enabled).toBeFalsy();
        });
    });

    describe('Enabled rate limit watcher', () => {
        it(`Shouldn't skip if the queue size can fit the report`, () => {
            const rateLimitWatcher = new RateLimitWatcher(1);
            expect(rateLimitWatcher.skipReport()).toBeFalsy();
        });

        it(`Should skip if the queue size extends the limit`, () => {
            const rateLimitWatcher = new RateLimitWatcher(1);
            expect(rateLimitWatcher.skipReport()).toBeFalsy();
            expect(rateLimitWatcher.skipReport()).toBeTruthy();
        });

        it(`Should remove timestamps before checking the report`, () => {
            let timestamp = Date.now();
            jest.spyOn(TimeHelper, 'now').mockImplementation(() => {
                return timestamp++;
            });
            const rateLimitWatcher = new RateLimitWatcher(1);

            rateLimitWatcher.skipReport();
            // skip 60 secs
            timestamp = timestamp + rateLimitWatcher.MAXIMUM_TIME_IN_QUEUE + 1;

            expect(rateLimitWatcher.skipReport()).toBeFalsy();
        });

        it(`Should not remove timestamp from the queue to make space for the new one`, () => {
            let timestamp = Date.now();

            jest.spyOn(TimeHelper, 'now').mockImplementation(() => {
                return timestamp++;
            });
            const numberOfReports = 6;
            const rateLimitWatcher = new RateLimitWatcher(numberOfReports);
            for (let reportIndex = 0; reportIndex < numberOfReports; reportIndex++) {
                rateLimitWatcher.skipReport();
            }
            expect(rateLimitWatcher.skipReport()).toBeTruthy();
            // skip only part of reports
            timestamp += rateLimitWatcher.MAXIMUM_TIME_IN_QUEUE - numberOfReports / 2;

            expect(rateLimitWatcher.skipReport()).toBeFalsy();
        });
    });
});
