import {
    BacktraceSubmitSummedMetricEventBody,
    BacktraceSubmitUniqueMetricEventBody,
} from './BacktraceSubmitMetricEventBody.js';

export interface BacktraceSubmitMetricsMetadataBody {
    dropped_events?: number;
}

export type BacktraceSubmitSummedMetricsBody = {
    application: string;
    appversion: string;
    metadata?: BacktraceSubmitMetricsMetadataBody;
    summed_events: BacktraceSubmitSummedMetricEventBody[];
};

export type BacktraceSubmitUniqueMetricsBody = {
    application: string;
    appversion: string;
    metadata?: BacktraceSubmitMetricsMetadataBody;
    unique_events: BacktraceSubmitUniqueMetricEventBody[];
};
