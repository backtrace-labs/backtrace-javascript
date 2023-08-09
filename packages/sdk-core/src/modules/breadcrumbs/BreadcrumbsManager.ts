import {
    BacktraceBreadcrumbs,
    BreadcrumbLogLevel,
    BreadcrumbType,
    defaultBreadcrumbsLogLevel,
    defaultBreadcurmbType,
} from '.';
import { BacktraceBreadcrumbsSettings } from '../../model/configuration/BacktraceConfiguration';
import { AttributeType } from '../../model/data/BacktraceData';
import { BacktraceReport } from '../../model/report/BacktraceReport';
import { BreadcrumbsSetup } from './BreadcrumbsSetup';
import { BreadcrumbsEventSubscriber } from './events/BreadcrurmbsEventSubscriber';
import { ConsoleEventSubscriber } from './events/ConsoleEventSubscriber';
import { BreadcrumbsStorage } from './storage/BreadcrumbsStorage';
import { InMemoryBreadcrumbsStorage } from './storage/InMemoryBreadcrumbsStorage';

export class BreadcrumbsManager implements BacktraceBreadcrumbs {
    /**
     * Breadcrumbs type
     */
    public readonly breadcrumbsType: BreadcrumbType;

    public readonly BREADCRUMB_ATTRIBUTE_NAME = 'breadcrumbs.lastId';

    /**
     * Breadcrumbs Log level
     */
    public readonly logLevel: BreadcrumbLogLevel;

    get type(): 'scoped' | 'dynamic' {
        return 'dynamic';
    }

    public readonly breadcrumbsStorage: BreadcrumbsStorage;

    /**
     * Determines if the breadcrumb manager is enabled.
     */
    private _enabled = true;
    private readonly _eventSubscribers: BreadcrumbsEventSubscriber[] = [new ConsoleEventSubscriber()];

    constructor(configuration?: BacktraceBreadcrumbsSettings, options?: BreadcrumbsSetup) {
        this.breadcrumbsType = configuration?.eventType ?? defaultBreadcurmbType;
        this.logLevel = configuration?.logLevel ?? defaultBreadcrumbsLogLevel;
        this.breadcrumbsStorage = options?.storage ?? new InMemoryBreadcrumbsStorage(configuration?.maximumBreadcrumbs);
        if (options?.subscribers) {
            this._eventSubscribers.push(...options.subscribers);
        }
    }

    public dispose(): void {
        this._enabled = false;
        for (const subscriber of this._eventSubscribers) {
            subscriber.dispose();
        }
    }

    public get(): Record<string, number> {
        return {
            [this.BREADCRUMB_ATTRIBUTE_NAME]: this.breadcrumbsStorage.lastBreadcrumbId,
        };
    }

    public start() {
        for (const subscriber of this._eventSubscribers) {
            subscriber.start(this);
        }
    }

    public verbose(message: string, attributes?: Record<string, AttributeType> | undefined): boolean {
        return this.log(message, BreadcrumbLogLevel.Verbose, attributes);
    }
    public debug(message: string, attributes?: Record<string, AttributeType> | undefined): boolean {
        return this.log(message, BreadcrumbLogLevel.Debug, attributes);
    }
    public info(message: string, attributes?: Record<string, AttributeType> | undefined): boolean {
        return this.log(message, BreadcrumbLogLevel.Info, attributes);
    }
    public warn(message: string, attributes?: Record<string, AttributeType> | undefined): boolean {
        return this.log(message, BreadcrumbLogLevel.Warning, attributes);
    }
    public error(message: string, attributes?: Record<string, AttributeType> | undefined): boolean {
        return this.log(message, BreadcrumbLogLevel.Error, attributes);
    }
    public log(
        message: string,
        level: BreadcrumbLogLevel,
        attributes?: Record<string, AttributeType> | undefined,
    ): boolean {
        return this.addBreadcrumb(message, level, BreadcrumbType.Manual, attributes);
    }

    public logReport(report: BacktraceReport) {
        const level = report.data instanceof Error ? BreadcrumbLogLevel.Error : BreadcrumbLogLevel.Warning;
        return this.addBreadcrumb(report.message, level, BreadcrumbType.System);
    }

    public addBreadcrumb(
        message: string,
        level: BreadcrumbLogLevel,
        type: BreadcrumbType,
        attributes?: Record<string, AttributeType> | undefined,
    ): boolean {
        if (!this._enabled) {
            return false;
        }
        if ((this.logLevel & level) !== level) {
            return false;
        }

        if ((this.breadcrumbsType & type) !== type) {
            return false;
        }

        this.breadcrumbsStorage.add(message, level, type, attributes);
        return true;
    }
}