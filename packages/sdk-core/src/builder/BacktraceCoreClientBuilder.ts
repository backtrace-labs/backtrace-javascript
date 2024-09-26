import { BacktraceReportSubmission } from '../model/http/BacktraceReportSubmission.js';
import { BacktraceRequestHandler } from '../model/http/BacktraceRequestHandler.js';
import { BacktraceModule } from '../modules/BacktraceModule.js';
import { BacktraceAttributeProvider } from '../modules/attribute/BacktraceAttributeProvider.js';
import {
    BreadcrumbsEventSubscriber,
    BreadcrumbsStorage,
    BreadcrumbsStorageFactory,
} from '../modules/breadcrumbs/index.js';
import { BacktraceStackTraceConverter } from '../modules/converter/index.js';
import { BacktraceSessionProvider } from '../modules/metrics/BacktraceSessionProvider.js';
import { MetricsQueue } from '../modules/metrics/MetricsQueue.js';
import { SummedEvent } from '../modules/metrics/model/SummedEvent.js';
import { UniqueEvent } from '../modules/metrics/model/UniqueEvent.js';
import { FileSystem } from '../modules/storage/index.js';
import { CoreClientSetup } from './CoreClientSetup.js';

type Writeable<T> = { -readonly [P in keyof T]: T[P] };

export abstract class BacktraceCoreClientBuilder<S extends Partial<CoreClientSetup> = Partial<CoreClientSetup>> {
    constructor(protected readonly clientSetup: Writeable<S>) {}

    public addAttributeProvider(provider: BacktraceAttributeProvider) {
        if (!this.clientSetup.attributeProviders) {
            this.clientSetup.attributeProviders = [provider];
        } else {
            this.clientSetup.attributeProviders.push(provider);
        }
        return this;
    }

    public useBreadcrumbSubscriber(breadcrumbSubscriber: BreadcrumbsEventSubscriber): this {
        if (!this.clientSetup.breadcrumbsSetup) {
            this.clientSetup.breadcrumbsSetup = {};
        }

        if (!this.clientSetup.breadcrumbsSetup.subscribers) {
            this.clientSetup.breadcrumbsSetup.subscribers = [breadcrumbSubscriber];
        } else {
            this.clientSetup.breadcrumbsSetup.subscribers.push(breadcrumbSubscriber);
        }

        return this;
    }

    public useBreadcrumbsStorage(storageFactory: BreadcrumbsStorageFactory): this;
    /**
     * @deprecated Use `useBreadcrumbsStorage` with `BreadcrumbsStorageFactory`.
     */
    public useBreadcrumbsStorage(storage: BreadcrumbsStorage): this;
    public useBreadcrumbsStorage(storage: BreadcrumbsStorage | BreadcrumbsStorageFactory): this {
        if (!this.clientSetup.breadcrumbsSetup) {
            this.clientSetup.breadcrumbsSetup = {};
        }

        if (typeof storage === 'function') {
            this.clientSetup.breadcrumbsSetup.storage = storage;
        } else {
            this.clientSetup.breadcrumbsSetup.storage = () => storage;
        }

        return this;
    }

    public useSessionProvider(sessionProvider: BacktraceSessionProvider): this {
        this.clientSetup.sessionProvider = sessionProvider;
        return this;
    }

    public useRequestHandler(handler: BacktraceRequestHandler): this {
        this.clientSetup.requestHandler = handler;
        return this;
    }

    public useStackTraceConverter(stackTraceConverter: BacktraceStackTraceConverter): this {
        this.clientSetup.stackTraceConverter = stackTraceConverter;
        return this;
    }

    public useFileSystem(fileSystem: FileSystem): this {
        this.clientSetup.fileSystem = fileSystem;
        return this;
    }

    public useReportSubmission(reportSubmission: BacktraceReportSubmission) {
        this.clientSetup.reportSubmission = reportSubmission;
        return this;
    }

    public useSummedMetricsQueue(queue: MetricsQueue<SummedEvent>) {
        this.clientSetup.summedMetricsQueue = queue;
        return this;
    }

    public useUniqueMetricsQueue(queue: MetricsQueue<UniqueEvent>) {
        this.clientSetup.uniqueMetricsQueue = queue;
        return this;
    }

    public useModule(module: BacktraceModule) {
        if (!this.clientSetup.modules) {
            this.clientSetup.modules = [module];
        } else {
            this.clientSetup.modules.push(module);
        }
        return this;
    }
}
