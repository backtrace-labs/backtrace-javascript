import { IdGenerator } from '../../../common/IdGenerator';
import { TimeHelper } from '../../../common/TimeHelper';
import { AttributeType } from '../../../model/data/BacktraceData';

export class MetricsEvent<V extends string | string[] = string | string[]> {
    public readonly id = IdGenerator.uuid();
    constructor(
        public readonly metricGroupName: string,
        public readonly metricGroupValue: V,
        public readonly attributes: Record<string, AttributeType> = {},
    ) {}

    public toJSON() {
        return {
            timestamp: TimeHelper.toTimestampInSec(TimeHelper.now()),
            attributes: this.attributes,
            [this.metricGroupName]: this.metricGroupValue,
        };
    }
}
