import { AttributeManager } from '../../src/modules/attribute/AttributeManager';
import { MetricsBuilder } from '../../src/modules/metrics/MetricsBuilder';
import { SingleSessionProvider } from '../../src/modules/metrics/SingleSessionProvider';
import { APPLICATION, APPLICATION_VERSION, TEST_SUBMISSION_URL } from '../mocks/BacktraceTestClient';
import { testHttpClient } from '../mocks/testHttpClient';

describe('Metric setup', () => {
    let attributeManager: AttributeManager;

    beforeEach(() => {
        attributeManager = new AttributeManager([]);
    });

    describe('Enabled metrics', () => {
        it('Should successfuly build metrics client', () => {
            attributeManager.add({
                application: APPLICATION,
                ['application.version']: APPLICATION_VERSION,
            });

            const metrics = new MetricsBuilder(
                {
                    url: TEST_SUBMISSION_URL,
                    metrics: {
                        autoSendInterval: 0,
                    },
                },
                new SingleSessionProvider(),
                attributeManager,
                testHttpClient,
            ).build();

            expect(metrics).toBeDefined();
        });

        it('Should successfuly send metrics', () => {
            attributeManager.add({
                application: APPLICATION,
                ['application.version']: APPLICATION_VERSION,
            });

            const metrics = new MetricsBuilder(
                {
                    url: TEST_SUBMISSION_URL,
                    metrics: {
                        autoSendInterval: 0,
                    },
                },
                new SingleSessionProvider(),
                attributeManager,
                testHttpClient,
            ).build();

            if (!metrics) {
                return fail('Metrics is not defined');
            }
            expect(metrics.send()).toBeTruthy();
        });
    });
    describe('Disabled metrics', () => {
        it(`Shouldn't build a client with invalid url`, () => {
            const metrics = new MetricsBuilder(
                {
                    url: 'https://definitely-different.submission.url',
                    metrics: {
                        autoSendInterval: 0,
                    },
                },
                new SingleSessionProvider(),
                attributeManager,
                testHttpClient,
            ).build();

            expect(metrics).toBeUndefined();
        });

        it(`Shouldn't build a client without application name`, () => {
            attributeManager.add({
                application: undefined,
                ['application.version']: APPLICATION_VERSION,
            });
            const metrics = new MetricsBuilder(
                {
                    url: TEST_SUBMISSION_URL,
                },
                new SingleSessionProvider(),
                attributeManager,
                testHttpClient,
            ).build();

            expect(metrics).toBeUndefined();
        });

        it(`Shouldn't build a client without application version`, () => {
            attributeManager.add({
                application: APPLICATION,
                ['application.version']: undefined,
            });
            const metrics = new MetricsBuilder(
                {
                    url: TEST_SUBMISSION_URL,
                },
                new SingleSessionProvider(),
                attributeManager,
                testHttpClient,
            ).build();

            expect(metrics).toBeUndefined();
        });

        it('Should not build the metric client if metrics are disabled', () => {
            const metrics = new MetricsBuilder(
                {
                    url: TEST_SUBMISSION_URL,
                    metrics: {
                        enable: false,
                    },
                },
                new SingleSessionProvider(),
                attributeManager,
                testHttpClient,
            ).build();

            expect(metrics).toBeUndefined();
        });
    });
});
