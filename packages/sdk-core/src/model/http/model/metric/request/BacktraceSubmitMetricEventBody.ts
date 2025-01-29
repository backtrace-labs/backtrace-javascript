import { AttributeType } from '../../../../data/BacktraceData.js';

export interface BacktraceSubmitSummedMetricEventBody {
    timestamp: number;
    attributes: Record<string, AttributeType>;
    metric_group: string;
}

export interface BacktraceSubmitUniqueMetricEventBody {
    timestamp: number;
    attributes: Record<string, AttributeType>;
    unique: string[];
}
