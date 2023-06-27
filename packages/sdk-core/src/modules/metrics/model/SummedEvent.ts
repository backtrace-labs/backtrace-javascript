import { AttributeType } from '../../../model/data/BacktraceData';
import { MetricsEvent } from './MetricsEvent';

export class SummedEvent extends MetricsEvent {
    constructor(metricGroupName: string, attributes: Record<string, AttributeType> = {}) {
        super('metric_group', metricGroupName, attributes);
    }
}
