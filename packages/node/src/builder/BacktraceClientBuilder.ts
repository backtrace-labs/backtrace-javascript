import { BacktraceCoreClientBuilder } from '@backtrace/sdk-core';
import { transformAttachment } from '../attachment/transformAttachments.js';
import {
    ApplicationInformationAttributeProvider,
    LinuxProcessStatusAttributeProvider,
    MachineAttributeProvider,
    MachineIdentitfierAttributeProvider,
    ProcessInformationAttributeProvider,
    ProcessStatusAttributeProvider,
} from '../attributes/index.js';
import { BacktraceClient } from '../BacktraceClient.js';
import { BacktraceStorageModuleFactory } from '../storage/BacktraceStorageModuleFactory.js';
import { BacktraceClientSetup, BacktraceNodeClientSetup } from './BacktraceClientSetup.js';

export class BacktraceClientBuilder extends BacktraceCoreClientBuilder<BacktraceClientSetup> {
    private storageFactory?: BacktraceStorageModuleFactory;

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

    public useStorageFactory(factory: BacktraceStorageModuleFactory) {
        this.storageFactory = factory;
        return this;
    }

    public build(): BacktraceClient {
        const instance = new BacktraceClient({
            ...this.clientSetup,
            storageFactory: this.storageFactory,
        } as BacktraceNodeClientSetup);
        instance.initialize();
        return instance;
    }
}
