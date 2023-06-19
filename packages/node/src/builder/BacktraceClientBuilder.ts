import { BacktraceAttachment, BacktraceAttributeProvider, BacktraceCoreClientBuilder } from '@backtrace/sdk-core';
import {
    LinuxProcessStatusAttributeProvider,
    MachineAttributeProvider,
    MachineIdentitfierAttributeProvider,
    ProcessInformationAttributeProvider,
    ProcessStatusAttributeProvider,
} from '../attributes';
import { BacktraceClient } from '../BacktraceClient';
import { BacktraceConfiguration } from '../BacktraceConfiguration';
import { BacktraceNodeRequestHandler } from '../BacktraceNodeRequestHandler';
import { BacktraceFileAttachment } from '../model/BacktraceFileAttachment';

export class BacktraceClientBuilder extends BacktraceCoreClientBuilder<BacktraceClient> {
    constructor(private readonly _options: BacktraceConfiguration) {
        super(new BacktraceNodeRequestHandler(_options), [
            new ProcessStatusAttributeProvider(),
            new MachineAttributeProvider(),
            new ProcessInformationAttributeProvider(),
            new LinuxProcessStatusAttributeProvider(),
            new MachineIdentitfierAttributeProvider(),
        ]);
    }

    public addAttributeProvider(provider: BacktraceAttributeProvider) {
        this.attributeProviders.push(provider);
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
        );
    }
}
