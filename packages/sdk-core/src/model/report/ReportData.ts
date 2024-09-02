import { AttributeType } from '../data/BacktraceData.js';

export interface ReportData {
    attributes: Record<string, AttributeType>;
    annotations: Record<string, unknown>;
}
