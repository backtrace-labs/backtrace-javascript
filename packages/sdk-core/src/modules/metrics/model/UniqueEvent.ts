import { AttributeType } from '../../../model/data/BacktraceData.js';
import { MetricsEvent } from './MetricsEvent.js';

export class UniqueEvent extends MetricsEvent<string[]> {
    constructor(attributes: Record<string, AttributeType>) {
        super('unique', ['guid'], attributes);
    }
}
