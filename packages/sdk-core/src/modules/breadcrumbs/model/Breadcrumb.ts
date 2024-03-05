import { Limited } from '../../../common/limitObjectDepth';
import { AttributeType } from '../../../model/data/BacktraceData';

export interface Breadcrumb {
    id: number;
    message: string;
    timestamp: number;
    level: string;
    type: string;
    attributes?: Limited<Record<string, AttributeType>>;
}
