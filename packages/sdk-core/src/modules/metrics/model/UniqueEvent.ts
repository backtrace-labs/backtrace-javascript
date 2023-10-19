import { AttributeType } from '../../../model/data/BacktraceData';
import { MetricsEvent } from './MetricsEvent';

export class UniqueEvent extends MetricsEvent<string[]> {
    constructor(attributes: Record<string, AttributeType>) {
        super('unique', ['guid'], attributes);
    }
}
