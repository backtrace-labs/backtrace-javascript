import { BacktraceCoreClientBuilder } from '@backtrace/sdk-core';
import {
    ApplicationInformationAttributeProvider,
    LinuxProcessStatusAttributeProvider,
    MachineAttributeProvider,
    MachineIdentitfierAttributeProvider,
    ProcessInformationAttributeProvider,
    ProcessStatusAttributeProvider,
} from '../attributes/index.js';
import { BacktraceClient } from '../BacktraceClient.js';
import { BacktraceSetupConfiguration } from '../BacktraceConfiguration.js';
import { BacktraceStorageModuleFactory } from '../storage/BacktraceStorageModuleFactory.js';
import { BacktraceClientSetup, BacktraceNodeClientSetup } from './BacktraceClientSetup.js';

export class BacktraceClientBuilder extends BacktraceCoreClientBuilder<BacktraceClientSetup> {
    private attachments: BacktraceSetupConfiguration['attachments'];
    private storageFactory?: BacktraceStorageModuleFactory;

    constructor(clientSetup: BacktraceNodeClientSetup) {
        super({
            ...clientSetup,
            options: { ...clientSetup.options, attachments: [] },
        });

        this.attachments = clientSetup.options.attachments;

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
            options: {
                ...this.clientSetup.options,
                attachments: this.attachments,
            },
        } as BacktraceNodeClientSetup);
        instance.initialize();
        return instance;
    }
}
