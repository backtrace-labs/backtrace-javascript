import { AttributeType } from '../../../model/data/BacktraceData';

export interface Breadcrumb {
    id: number;
    message: string;
    timestamp: number;
    level: string;
    type: string;
    attributes?: Record<string, AttributeType>;
}
