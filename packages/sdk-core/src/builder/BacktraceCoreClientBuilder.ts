import { BacktraceReportSubmission } from '../model/http/BacktraceReportSubmission';
import { BacktraceRequestHandler } from '../model/http/BacktraceRequestHandler';
import { BacktraceAttributeProvider } from '../modules/attribute/BacktraceAttributeProvider';
import { BreadcrumbsEventSubscriber } from '../modules/breadcrumbs';
import { BacktraceStackTraceConverter } from '../modules/converter';
import { BacktraceSessionProvider } from '../modules/metrics/BacktraceSessionProvider';
import { FileSystem } from '../modules/storage';
import { CoreClientSetup } from './CoreClientSetup';

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
}
