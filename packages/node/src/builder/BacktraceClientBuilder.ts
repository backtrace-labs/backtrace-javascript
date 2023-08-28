import {
    BacktraceAttachment,
    BacktraceAttributeProvider,
    BacktraceCoreClientBuilder,
    BacktraceSessionProvider,
    BreadcrumbsEventSubscriber,
} from '@backtrace-labs/sdk-core';
import { BacktraceFileAttachment } from '../attachment';
import {
    ApplicationInformationAttributeProvider,
    LinuxProcessStatusAttributeProvider,
    MachineAttributeProvider,
    MachineIdentitfierAttributeProvider,
    ProcessInformationAttributeProvider,
    ProcessStatusAttributeProvider,
} from '../attributes';
import { BacktraceClient } from '../BacktraceClient';
import { BacktraceConfiguration } from '../BacktraceConfiguration';
import { BacktraceNodeRequestHandler } from '../BacktraceNodeRequestHandler';

export class BacktraceClientBuilder extends BacktraceCoreClientBuilder<BacktraceClient> {
    constructor(
        private readonly _options: BacktraceConfiguration,
        attributeProvider: BacktraceAttributeProvider[] = [
            new ApplicationInformationAttributeProvider(_options),
            new ProcessStatusAttributeProvider(),
            new MachineAttributeProvider(),
            new ProcessInformationAttributeProvider(),
            new LinuxProcessStatusAttributeProvider(),
            new MachineIdentitfierAttributeProvider(),
        ],
        breadcrumbsSubscribers: BreadcrumbsEventSubscriber[] = [],
        sessionProvider?: BacktraceSessionProvider,
    ) {
        super(new BacktraceNodeRequestHandler(_options), attributeProvider, breadcrumbsSubscribers, sessionProvider);
    }

    /**
     * Transform client attachments into the attachment model.
     * @returns attachments
     */
    private transformAttachments(): BacktraceAttachment[] {
        return (
            this._options.attachments?.map((n) => (typeof n === 'string' ? new BacktraceFileAttachment(n) : n)) ?? []
        );
    }

    public build(): BacktraceClient {
        return new BacktraceClient(
            { ...this._options, attachments: this.transformAttachments() },
            this.handler,
            this.attributeProviders,
            this.breadcrumbsSubscribers,
        );
    }
}
