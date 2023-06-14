import { BacktraceReport } from '../../src';
import { TimeHelper } from '../../src/common/TimeHelper';
import { RateLimitWatcher } from '../../src/model/data/RateLimitWatcher';
describe('Report Limit Watcher tests', () => {
    describe('Disabled rate limit watcher', () => {
        it('Should disable limit watcher when the report limit is set to 0', () => {
            const rateLimitWatcher = new RateLimitWatcher(0);
            expect(rateLimitWatcher.enabled).toBeFalsy();
        });

        it(`Skip report method should always return false for disabled rate limiter`, () => {
            const rateLimitWatcher = new RateLimitWatcher(0);
            expect(rateLimitWatcher.skipReport(new BacktraceReport(''))).toBeFalsy();
        });

        it('Should disable rate limit watcher on undefined options', () => {
            const rateLimitWatcher = new RateLimitWatcher(undefined);
            expect(rateLimitWatcher.enabled).toBeFalsy();
        });
    });

    describe('Enabled rate limit watcher', () => {
        it(`Shouldn't skip if the queue size can fit the report`, () => {
            const rateLimitWatcher = new RateLimitWatcher(1);
            expect(rateLimitWatcher.skipReport(new BacktraceReport(''))).toBeFalsy();
        });

        it(`Should skip if the queue size extends the limit`, () => {
            const rateLimitWatcher = new RateLimitWatcher(1);
            expect(rateLimitWatcher.skipReport(new BacktraceReport(''))).toBeFalsy();
            expect(rateLimitWatcher.skipReport(new BacktraceReport(''))).toBeTruthy();
        });

        it(`Should remove reports before checking the report`, () => {
            let timestamp = Date.now();
            jest.spyOn(TimeHelper, 'now').mockImplementation(() => {
                return timestamp++;
            });
            const rateLimitWatcher = new RateLimitWatcher(1);

            rateLimitWatcher.skipReport(new BacktraceReport(''));
            // skip 60 secs
            timestamp = timestamp + rateLimitWatcher.MAXIMUM_TIME_IN_QUEUE + 1;

            expect(rateLimitWatcher.skipReport(new BacktraceReport(''))).toBeFalsy();
        });
    });
});
