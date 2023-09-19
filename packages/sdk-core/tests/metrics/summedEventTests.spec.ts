import { TimeHelper } from '../../src/common/TimeHelper';
import { AttributeType } from '../../src/model/data/BacktraceData';
import { AttributeManager } from '../../src/modules/attribute/AttributeManager';
import { MetricsBuilder } from '../../src/modules/metrics/MetricsBuilder';
import { MetricsUrlInformation } from '../../src/modules/metrics/MetricsUrlInformation';
import { SummedEvent } from '../../src/modules/metrics/model/SummedEvent';
import { SingleSessionProvider } from '../../src/modules/metrics/SingleSessionProvider';
import { APPLICATION, APPLICATION_VERSION, TEST_SUBMISSION_URL } from '../mocks/BacktraceTestClient';
import { testHttpClient } from '../mocks/testHttpClient';
import { mockSubmissionQueue } from './mocks/mockSubmissionQueue';

describe('Summed events tests', () => {
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

    it('Should send summed event on the metrics start', () => {
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
        ).build(mockSubmissionQueue);

        if (!metrics) {
            fail('Metrics are not defined');
        }
        const summedEventsSubmissionUrl = MetricsUrlInformation.generateSummedEventsUrl(
            metrics.metricsHost,
            TEST_SUBMISSION_URL,
        );

        const expectedJson = {
            application: APPLICATION,
            appversion: APPLICATION_VERSION,
            summed_events: [new SummedEvent('Application Launches', attributeManager.get().attributes)],
            metadata: {
                dropped_events: 0,
            },
        };

        metrics.initialize();

        expect(testHttpClient.post).toBeCalledWith(summedEventsSubmissionUrl, JSON.stringify(expectedJson));
    });

    it('Should send summed event to overriden submission URL', () => {
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
        ).build(mockSubmissionQueue);

        if (!metrics) {
            fail('Metrics are not defined');
        }
        const summedEventsSubmissionUrl = MetricsUrlInformation.generateSummedEventsUrl(
            metrics.metricsHost,
            TEST_SUBMISSION_URL,
        );

        const expectedJson = {
            application: APPLICATION,
            appversion: APPLICATION_VERSION,
            summed_events: [new SummedEvent('Application Launches', attributeManager.get().attributes)],
            metadata: {
                dropped_events: 0,
            },
        };

        metrics.initialize();

        expect(testHttpClient.post).toBeCalledWith(summedEventsSubmissionUrl, JSON.stringify(expectedJson));
    });

    it('Should send summed event with custom attributes to the server', () => {
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
        ).build(mockSubmissionQueue);

        if (!metrics) {
            fail('Metrics are not defined');
        }
        const expectedJson = {
            application: APPLICATION,
            appversion: APPLICATION_VERSION,
            summed_events: [new SummedEvent('Application Launches', attributeManager.get().attributes)],
            metadata: {
                dropped_events: 0,
            },
        };

        metrics.initialize();

        expect(attributeManager.get().attributes).toMatchObject(customAttributes);
        expect(testHttpClient.post).toBeCalledWith(expect.anything(), JSON.stringify(expectedJson));
    });

    it('Should add summed event to the submission queue', () => {
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
        ).build(mockSubmissionQueue);

        if (!metrics) {
            fail('Metrics are not defined');
        }
        metrics.initialize();
        const addResult = metrics.addSummedEvent('test-metric');

        expect(addResult).toBeTruthy();
        expect(testHttpClient.post).toBeCalledTimes(1);
        expect(metrics.count()).toEqual(1);
    });

    it('Should send summed events to server when reached the limit', () => {
        const maximumNumberOfEvents = 3;
        const metrics = new MetricsBuilder(
            {
                url: TEST_SUBMISSION_URL,
                metrics: {
                    autoSendInterval: 0,
                    size: maximumNumberOfEvents,
                },
            },
            new SingleSessionProvider(),
            attributeManager,
            testHttpClient,
        ).build(mockSubmissionQueue);

        if (!metrics) {
            fail('Metrics are not defined');
        }

        metrics.initialize();

        for (let index = 0; index < maximumNumberOfEvents; index++) {
            const addResult = metrics.addSummedEvent('test-metric');
            expect(addResult).toBeTruthy();
        }

        expect(testHttpClient.post).toBeCalledTimes(2);
    });
});
