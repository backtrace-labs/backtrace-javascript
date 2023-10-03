import { BacktraceCoreClient } from '../BacktraceCoreClient';
import { BacktraceRequestHandler } from '../model/http/BacktraceRequestHandler';
import { BacktraceAttributeProvider } from '../modules/attribute/BacktraceAttributeProvider';
import { BreadcrumbsEventSubscriber } from '../modules/breadcrumbs';
import { BacktraceStackTraceConverter } from '../modules/converter';
import { BacktraceSessionProvider } from '../modules/metrics/BacktraceSessionProvider';
import { FileSystem } from '../modules/storage';

export abstract class BacktraceCoreClientBuilder<T extends BacktraceCoreClient> {
    protected stackTraceConverter?: BacktraceStackTraceConverter;
    protected fileSystem?: FileSystem;

    constructor(
        protected handler: BacktraceRequestHandler,
        protected readonly attributeProviders: BacktraceAttributeProvider[] = [],
        protected readonly breadcrumbsSubscribers: BreadcrumbsEventSubscriber[] = [],
        protected sessionProvider?: BacktraceSessionProvider,
    ) {}

    public addAttributeProvider(provider: BacktraceAttributeProvider) {
        this.attributeProviders.push(provider);
        return this;
    }

    public useBreadcrumbSubscriber(breadcrumbSubscriber: BreadcrumbsEventSubscriber): this {
        this.breadcrumbsSubscribers.push(breadcrumbSubscriber);
        return this;
    }

    public useSessionProvider(sessionProvider: BacktraceSessionProvider): this {
        this.sessionProvider = sessionProvider;
        return this;
    }

    public useRequestHandler(handler: BacktraceRequestHandler): this {
        this.handler = handler;
        return this;
    }

    public useStackTraceConverter(stackTraceConverter: BacktraceStackTraceConverter): this {
        this.stackTraceConverter = stackTraceConverter;
        return this;
    }

    public useFileSystem(fileSystem: FileSystem): this {
        this.fileSystem = fileSystem;
        return this;
    }

    public abstract build(): T;
}
