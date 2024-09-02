import { AttributeType } from '../../model/data/BacktraceData.js';
import { BreadcrumbsEventSubscriber } from './events/BreadcrumbsEventSubscriber.js';
import { BreadcrumbLogLevel } from './model/BreadcrumbLogLevel.js';
import { BreadcrumbType } from './model/BreadcrumbType.js';

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
     * Adds and starts `BreadcrumbsEventSubscriber` with this instance of `BacktraceBreadcrumbs`.
     * @param subscriber
     */
    addEventSubscriber(subscriber: BreadcrumbsEventSubscriber): void;

    addBreadcrumb(
        message: string,
        level: BreadcrumbLogLevel,
        type: BreadcrumbType,
        attributes?: Record<string, AttributeType> | undefined,
    ): void;
    verbose(message: string, attributes?: Record<string, AttributeType>): void;
    debug(message: string, attributes?: Record<string, AttributeType>): void;
    info(message: string, attributes?: Record<string, AttributeType>): void;
    warn(message: string, attributes?: Record<string, AttributeType>): void;
    error(message: string, attributes?: Record<string, AttributeType>): void;
    log(message: string, level: BreadcrumbLogLevel, attributes?: Record<string, AttributeType>): void;
}
