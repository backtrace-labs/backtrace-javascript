import { jsonEscaper } from '../../common/jsonEscaper.js';
import { jsonSize } from '../../common/jsonSize.js';
import { limitObjectDepth } from '../../common/limitObjectDepth.js';
import { BacktraceBreadcrumbsSettings } from '../../model/configuration/BacktraceConfiguration.js';
import { AttributeType } from '../../model/data/BacktraceData.js';
import { BacktraceReport } from '../../model/report/BacktraceReport.js';
import { BacktraceModule, BacktraceModuleBindData } from '../BacktraceModule.js';
import { BreadcrumbsEventSubscriber } from './events/BreadcrumbsEventSubscriber.js';
import { ConsoleEventSubscriber } from './events/ConsoleEventSubscriber.js';
import {
    BacktraceBreadcrumbs,
    BreadcrumbLogLevel,
    BreadcrumbsSetup,
    BreadcrumbsStorage,
    BreadcrumbType,
    defaultBreadcrumbsLogLevel,
    defaultBreadcurmbType,
} from './index.js';
import { BreadcrumbLimits } from './model/BreadcrumbLimits.js';
import { LimitedRawBreadcrumb, RawBreadcrumb } from './model/RawBreadcrumb.js';
import { InMemoryBreadcrumbsStorage } from './storage/InMemoryBreadcrumbsStorage.js';

const BREADCRUMB_ATTRIBUTE_NAME = 'breadcrumbs.lastId';

export class BreadcrumbsManager implements BacktraceBreadcrumbs, BacktraceModule {
    /**
     * Breadcrumbs type
     */
    public readonly breadcrumbsType: BreadcrumbType;

    /**
     * Breadcrumbs Log level
     */
    public readonly logLevel: BreadcrumbLogLevel;
    /**
     * Determines if the breadcrumb manager is enabled.
     */
    private _enabled = false;

    private readonly _limits: BreadcrumbLimits;
    private readonly _eventSubscribers: BreadcrumbsEventSubscriber[] = [new ConsoleEventSubscriber()];
    private readonly _interceptor?: (breadcrumb: RawBreadcrumb) => RawBreadcrumb | undefined;
    private _storage: BreadcrumbsStorage;

    constructor(configuration?: BacktraceBreadcrumbsSettings, options?: BreadcrumbsSetup) {
        this.breadcrumbsType = configuration?.eventType ?? defaultBreadcurmbType;
        this.logLevel = configuration?.logLevel ?? defaultBreadcrumbsLogLevel;
        this._storage = options?.storage ?? new InMemoryBreadcrumbsStorage(configuration?.maximumBreadcrumbs);
        this._interceptor = configuration?.intercept;
        if (options?.subscribers) {
            this._eventSubscribers.push(...options.subscribers);
        }

        this._limits = {
            maximumAttributesDepth: configuration?.maximumAttributesDepth,
            maximumBreadcrumbMessageLength: configuration?.maximumBreadcrumbMessageLength,
            maximumBreadcrumbSize: configuration?.maximumBreadcrumbSize,
            maximumBreadcrumbsSize: configuration?.maximumBreadcrumbsSize,
        };
    }

    public addEventSubscriber(subscriber: BreadcrumbsEventSubscriber) {
        if (this._enabled) {
            subscriber.start(this);
        }
        this._eventSubscribers.push(subscriber);
    }

    public setStorage(storage: BreadcrumbsStorage) {
        this._storage = storage;
    }

    public dispose(): void {
        this._enabled = false;
        for (const subscriber of this._eventSubscribers) {
            subscriber.dispose();
        }
    }

    public bind({ client, reportEvents, attachmentManager }: BacktraceModuleBindData): void {
        if (this._storage.getAttachmentProviders) {
            attachmentManager.addProviders(...this._storage.getAttachmentProviders());
        } else {
            attachmentManager.add(...this._storage.getAttachments());
        }

        client.addAttribute(() => ({
            [BREADCRUMB_ATTRIBUTE_NAME]: this._storage.lastBreadcrumbId,
        }));

        reportEvents.on('before-skip', (report) => this.logReport(report));
    }

    public initialize() {
        if (this._enabled) {
            return;
        }

        for (const subscriber of this._eventSubscribers) {
            subscriber.start(this);
        }
        this._enabled = true;
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
            message: this.prepareBreadcrumbMessage(message),
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

        if (this._limits.maximumBreadcrumbMessageLength !== undefined) {
            rawBreadcrumb = {
                ...rawBreadcrumb,
                message: rawBreadcrumb.message.substring(0, this._limits.maximumBreadcrumbMessageLength),
            };
        }

        let limitedBreadcrumb: RawBreadcrumb | LimitedRawBreadcrumb;
        if (this._limits.maximumAttributesDepth !== undefined && rawBreadcrumb.attributes) {
            limitedBreadcrumb = {
                ...rawBreadcrumb,
                attributes: limitObjectDepth(rawBreadcrumb.attributes, this._limits.maximumAttributesDepth),
            };
        } else {
            limitedBreadcrumb = rawBreadcrumb;
        }

        if (this._limits.maximumBreadcrumbSize !== undefined) {
            const breadcrumbSize = jsonSize(limitedBreadcrumb, jsonEscaper());
            if (breadcrumbSize > this._limits.maximumBreadcrumbSize) {
                // TODO: Trim the breadcrumb
                return false;
            }
        }

        this._storage.add(limitedBreadcrumb);
        return true;
    }

    /**
     * The expectation is, message should always be defined and passed as string.
     * However, logger can pass as a message an object or any other unknown type.
     * To be sure the code won't break, this method ensures the message is always a string
     * no matter what the logger gives us.
     * @param message breadcrumb message
     */
    private prepareBreadcrumbMessage(message: unknown): string {
        if (message == null) {
            return '';
        }

        const messageType = typeof message;

        switch (messageType) {
            case 'string': {
                return message as string;
            }
            case 'object': {
                return JSON.stringify(message, jsonEscaper());
            }
            default: {
                return message.toString();
            }
        }
    }
}
