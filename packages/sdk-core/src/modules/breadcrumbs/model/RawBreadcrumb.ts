import { AttributeType } from '../../../model/data';
import { BreadcrumbLogLevel } from './BreadcrumbLogLevel';
import { BreadcrumbType } from './BreadcrumbType';

export interface RawBreadcrumb {
    message: string;
    level: BreadcrumbLogLevel;
    type: BreadcrumbType;
    attributes?: Record<string, AttributeType>;
}
