import { AttributeType } from '../data/BacktraceData';

export interface ReportAttribute {
    attributes: Record<string, AttributeType>;
    annotations: Record<string, unknown>;
}
