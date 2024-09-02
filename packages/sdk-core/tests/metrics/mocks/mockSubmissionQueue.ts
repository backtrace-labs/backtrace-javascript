import { MetricsQueue } from '../../../src/modules/metrics/MetricsQueue.js';
import { MetricsEvent } from '../../../src/modules/metrics/model/MetricsEvent.js';

export const mockSubmissionQueue: MetricsQueue<MetricsEvent> = {
    total: 0,
    submissionUrl: 'fake-http-url',
    maximumEvents: 0,
    add: () => {
        return;
    },
    send: () => {
        return Promise.resolve();
    },
};
