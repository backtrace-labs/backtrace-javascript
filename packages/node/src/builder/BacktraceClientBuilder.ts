import { BacktraceCoreClientBuilder } from '@backtrace/sdk-core';
import { transformAttachment } from '../attachment/transformAttachments';
import {
    ApplicationInformationAttributeProvider,
    LinuxProcessStatusAttributeProvider,
    MachineAttributeProvider,
    MachineIdentitfierAttributeProvider,
    ProcessInformationAttributeProvider,
    ProcessStatusAttributeProvider,
} from '../attributes';
import { BacktraceClient } from '../BacktraceClient';
import { BacktraceClientSetup, BacktraceNodeClientSetup } from './BacktraceClientSetup';

export class BacktraceClientBuilder extends BacktraceCoreClientBuilder<BacktraceClientSetup> {
    constructor(clientSetup: BacktraceNodeClientSetup) {
        super({
            ...clientSetup,
            options: { ...clientSetup.options, attachments: clientSetup.options.attachments?.map(transformAttachment) },
        });

        this.addAttributeProvider(new ApplicationInformationAttributeProvider());
        this.addAttributeProvider(new ProcessStatusAttributeProvider());
        this.addAttributeProvider(new MachineAttributeProvider());
        this.addAttributeProvider(new ProcessInformationAttributeProvider());
        this.addAttributeProvider(new LinuxProcessStatusAttributeProvider());
        this.addAttributeProvider(new MachineIdentitfierAttributeProvider());
    }

    public build(): BacktraceClient {
        const instance = new BacktraceClient(this.clientSetup as BacktraceNodeClientSetup);
        instance.initialize();
        return instance;
    }
}
