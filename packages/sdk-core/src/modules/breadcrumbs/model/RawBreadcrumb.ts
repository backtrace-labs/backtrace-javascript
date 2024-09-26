import { Limited } from '../../../common/limitObjectDepth.js';
import { AttributeType } from '../../../model/data/index.js';
import { BreadcrumbLogLevel } from './BreadcrumbLogLevel.js';
import { BreadcrumbType } from './BreadcrumbType.js';

export interface RawBreadcrumb {
    message: string;
    level: BreadcrumbLogLevel;
    type: BreadcrumbType;
    attributes?: Record<string, AttributeType>;
}

export interface LimitedRawBreadcrumb {
    message: string;
    level: BreadcrumbLogLevel;
    type: BreadcrumbType;
    attributes?: Limited<Record<string, AttributeType>>;
}
