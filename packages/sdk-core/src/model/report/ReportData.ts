import { AttributeType } from '../data/BacktraceData';

export interface ReportData {
    attributes: Record<string, AttributeType>;
    annotations: Record<string, unknown>;
}
