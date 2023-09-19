import {
    BacktraceBreadcrumbs,
    BreadcrumbLogLevel,
    BreadcrumbType,
    BreadcrumbsSetup,
    defaultBreadcrumbsLogLevel,
    defaultBreadcurmbType,
} from '.';
import { BacktraceCoreClient } from '../..';
import { BacktraceBreadcrumbsSettings } from '../../model/configuration/BacktraceConfiguration';
import { AttributeType } from '../../model/data/BacktraceData';
import { BacktraceReport } from '../../model/report/BacktraceReport';
import { BacktraceModule } from '../BacktraceModule';
import { BreadcrumbsEventSubscriber } from './events/BreadcrurmbsEventSubscriber';
import { ConsoleEventSubscriber } from './events/ConsoleEventSubscriber';
import { RawBreadcrumb } from './model/RawBreadcrumb';
import { BreadcrumbsStorage } from './storage/BreadcrumbsStorage';
import { InMemoryBreadcrumbsStorage } from './storage/InMemoryBreadcrumbsStorage';

export class BreadcrumbsManager implements BacktraceBreadcrumbs, BacktraceModule {
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

    private readonly _interceptor?: (breadcrumb: RawBreadcrumb) => RawBreadcrumb | undefined;

    constructor(configuration?: BacktraceBreadcrumbsSettings, options?: BreadcrumbsSetup) {
        this.breadcrumbsType = configuration?.eventType ?? defaultBreadcurmbType;
        this.logLevel = configuration?.logLevel ?? defaultBreadcrumbsLogLevel;
        this.breadcrumbsStorage = options?.storage ?? new InMemoryBreadcrumbsStorage(configuration?.maximumBreadcrumbs);
        this._interceptor = configuration?.intercept;
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

    public initialize(client: BacktraceCoreClient) {
        for (const subscriber of this._eventSubscribers) {
            subscriber.start(this);
        }

        client.reportEvents.on('before-skip', (report) => this.logReport(report));
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
        let rawBreadcrumb: RawBreadcrumb = {
            message,
            level,
            type,
            attributes,
        };
        if (this._interceptor) {
            const interceptorBreadcrumb = this._interceptor(rawBreadcrumb);
            if (!interceptorBreadcrumb) {
                return false;
            }
            rawBreadcrumb = interceptorBreadcrumb;
        }

        if ((this.logLevel & rawBreadcrumb.level) !== level) {
            return false;
        }

        if ((this.breadcrumbsType & rawBreadcrumb.type) !== type) {
            return false;
        }

        this.breadcrumbsStorage.add(rawBreadcrumb);
        return true;
    }
}
