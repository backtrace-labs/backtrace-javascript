import { BacktraceCoreClient } from '../BacktraceCoreClient';
import { BacktraceRequestHandler } from '../model/http/BacktraceRequestHandler';
import { BacktraceAttributeProvider } from '../modules/attribute/BacktraceAttributeProvider';
import { BreadcrumbsEventSubscriber } from '../modules/breadcrumbs';
import { BacktraceStackTraceConverter } from '../modules/converter';
import { BacktraceSessionProvider } from '../modules/metrics/BacktraceSessionProvider';

export abstract class BacktraceCoreClientBuilder<T extends BacktraceCoreClient> {
    protected stackTraceConverter?: BacktraceStackTraceConverter;

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

    public useBreadcrumbSubscriber(breadcrumbSubscriber: BreadcrumbsEventSubscriber): BacktraceCoreClientBuilder<T> {
        this.breadcrumbsSubscribers.push(breadcrumbSubscriber);
        return this;
    }

    public useSessionProvider(sessionProvider: BacktraceSessionProvider): BacktraceCoreClientBuilder<T> {
        this.sessionProvider = sessionProvider;
        return this;
    }

    public useRequestHandler(handler: BacktraceRequestHandler): BacktraceCoreClientBuilder<T> {
        this.handler = handler;
        return this;
    }

    public useStackTraceConverter(stackTraceConverter: BacktraceStackTraceConverter): BacktraceCoreClientBuilder<T> {
        this.stackTraceConverter = stackTraceConverter;
        return this;
    }
    public abstract build(): T;
}
