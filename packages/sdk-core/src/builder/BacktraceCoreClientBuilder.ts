import { BacktraceCoreClient } from '../BacktraceCoreClient';
import { BacktraceRequestHandler } from '../model/http/BacktraceRequestHandler';
import { BacktraceAttributeProvider } from '../modules/attribute/BacktraceAttributeProvider';
import { BreadcrumbsEventSubscriber } from '../modules/breadcrumbs';

export abstract class BacktraceCoreClientBuilder<T extends BacktraceCoreClient> {
    constructor(
        protected handler: BacktraceRequestHandler,
        protected readonly attributeProviders: BacktraceAttributeProvider[] = [],
        protected readonly breadcrumbSubscribers: BreadcrumbsEventSubscriber[] = [],
    ) {}

    public useBreadcrumbSubscriber(breadcrumbSubscriber: BreadcrumbsEventSubscriber) {
        this.breadcrumbSubscribers.push(breadcrumbSubscriber);
    }

    public useRequestHandler(handler: BacktraceRequestHandler): BacktraceCoreClientBuilder<T> {
        this.handler = handler;
        return this;
    }

    public abstract build(): T;
}
