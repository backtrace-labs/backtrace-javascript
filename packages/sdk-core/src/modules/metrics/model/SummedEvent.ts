import { AttributeType } from '../../../model/data/BacktraceData.js';
import { MetricsEvent } from './MetricsEvent.js';

export class SummedEvent extends MetricsEvent<string> {
    constructor(metricGroupName: string, attributes: Record<string, AttributeType> = {}) {
        super('metric_group', metricGroupName, attributes);
    }
}
