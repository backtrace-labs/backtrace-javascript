import { AttributeType } from '../../../model/data/index.js';
import { BreadcrumbLogLevel } from './BreadcrumbLogLevel.js';
import { BreadcrumbType } from './BreadcrumbType.js';

export interface RawBreadcrumb {
    message: string;
    level: BreadcrumbLogLevel;
    type: BreadcrumbType;
    attributes?: Record<string, AttributeType>;
}
