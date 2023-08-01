import { AttributeType } from '../../model/data/BacktraceData';
import { BreadcrumbLogLevel } from './model/BreadcrumbLogLevel';
import { BreadcrumbType } from './model/BreadcrumbType';

export interface BacktraceBreadcrumbs {
    /**
     * Breadcrumbs type
     */
    readonly breadcrumbsType: BreadcrumbType;

    /**
     * Breadcrumbs Log level
     */
    readonly logLevel: BreadcrumbLogLevel;

    /**
     * Dispose breadcrumbs integration
     */
    dispose(): void;

    verbose(message: string, attributes?: Record<string, AttributeType>): void;
    debug(message: string, attributes?: Record<string, AttributeType>): void;
    info(message: string, attributes?: Record<string, AttributeType>): void;
    warn(message: string, attributes?: Record<string, AttributeType>): void;
    error(message: string, attributes?: Record<string, AttributeType>): void;
    log(message: string, level: BreadcrumbLogLevel, attributes?: Record<string, AttributeType>): void;
}
