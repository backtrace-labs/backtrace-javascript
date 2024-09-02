import { fail } from 'assert';
import { TimeHelper } from '../../src/common/TimeHelper.js';
import { AttributeType } from '../../src/model/data/BacktraceData.js';
import { AttributeManager } from '../../src/modules/attribute/AttributeManager.js';
import { MetricsBuilder } from '../../src/modules/metrics/MetricsBuilder.js';
import { MetricsUrlInformation } from '../../src/modules/metrics/MetricsUrlInformation.js';
import { SingleSessionProvider } from '../../src/modules/metrics/SingleSessionProvider.js';
import { UniqueEvent } from '../../src/modules/metrics/model/UniqueEvent.js';
import { APPLICATION, APPLICATION_VERSION, TEST_SUBMISSION_URL } from '../mocks/BacktraceTestClient.js';
import { testHttpClient } from '../mocks/testHttpClient.js';
import { mockSubmissionQueue } from './mocks/mockSubmissionQueue.js';

describe('Unique events tests', () => {
    let timestamp: number;
    const attributeManager = new AttributeManager([]);

    beforeEach(() => {
        attributeManager.add({
            application: APPLICATION,
            ['application.version']: APPLICATION_VERSION,
        });
        timestamp = TimeHelper.now();
        jest.spyOn(TimeHelper, 'now').mockImplementation(() => {
            return timestamp;
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('Should send unique event on the metrics start', () => {
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
        ).build(undefined, mockSubmissionQueue);

        if (!metrics) {
            fail('Metrics are not defined');
        }
        const uniqueEventsSubmissionUrl = MetricsUrlInformation.generateUniqueEventsUrl(
            metrics.metricsHost,
            TEST_SUBMISSION_URL,
        );

        const expectedJson = {
            application: APPLICATION,
            appversion: APPLICATION_VERSION,
            unique_events: [new UniqueEvent(attributeManager.get().attributes)],
            metadata: {
                dropped_events: 0,
            },
        };

        metrics.initialize();

        expect(testHttpClient.post).toBeCalledWith(
            uniqueEventsSubmissionUrl,
            JSON.stringify(expectedJson),
            expect.anything(),
        );
    });

    it('Should send unique event to overriden submission URL', () => {
        const expectedBaseUrl = 'https://test-metrics-submission-url.com';
        const metrics = new MetricsBuilder(
            {
                url: TEST_SUBMISSION_URL,
                metrics: {
                    metricsSubmissionUrl: expectedBaseUrl,
                    autoSendInterval: 0,
                },
            },
            new SingleSessionProvider(),
            attributeManager,
            testHttpClient,
        ).build(undefined, mockSubmissionQueue);

        if (!metrics) {
            fail('Metrics are not defined');
        }

        const uniqueEventsSubmissionUrl = MetricsUrlInformation.generateUniqueEventsUrl(
            expectedBaseUrl,
            TEST_SUBMISSION_URL,
        );

        metrics.initialize();

        expect(testHttpClient.post).toBeCalledWith(uniqueEventsSubmissionUrl, expect.anything(), expect.anything());
    });

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

    it(`Shouldn't build a client without application name/version`, () => {
        attributeManager.add({
            application: undefined,
            ['application.version']: undefined,
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

        expect(metrics).toBeUndefined();
    });

    it('Should send unique event with custom attributes to the server', () => {
        const customAttributes: Record<string, AttributeType> = {
            'custom-attribute': 'custom-attribute',
            'second-attribute': 'false',
        };
        attributeManager.add(customAttributes);
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
        ).build(undefined, mockSubmissionQueue);

        if (!metrics) {
            fail('Metrics are not defined');
        }
        const uniqueEventsSubmissionUrl = MetricsUrlInformation.generateUniqueEventsUrl(
            metrics.metricsHost,
            TEST_SUBMISSION_URL,
        );

        const expectedJson = {
            application: APPLICATION,
            appversion: APPLICATION_VERSION,
            unique_events: [new UniqueEvent(attributeManager.get().attributes)],
            metadata: {
                dropped_events: 0,
            },
        };

        metrics.initialize();

        expect(attributeManager.get().attributes).toMatchObject(customAttributes);
        expect(testHttpClient.post).toBeCalledWith(
            uniqueEventsSubmissionUrl,
            JSON.stringify(expectedJson),
            expect.anything(),
        );
    });
});
