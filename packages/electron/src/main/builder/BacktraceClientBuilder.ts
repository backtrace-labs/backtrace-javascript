import { BacktraceNodeClientSetup, BacktraceClientBuilder as NodeBacktraceClientBuilder } from '@backtrace/node';
import { BacktraceClient } from '../BacktraceClient.js';
import { AllWindowsAttributeProvider } from '../attributes/AllWindowsAttributeProvider.js';
import { AppAttributeProvider } from '../attributes/AppAttributeProvider.js';
import { ApplicationInformationAttributeProvider } from '../attributes/ApplicationInformationAttributeProvider.js';
import { GpuAttributeProvider } from '../attributes/GpuAttributeProvider.js';
import { GpuFeatureAttributeProvider } from '../attributes/GpuFeatureAttributeProvider.js';
import { NetAttributeProvider } from '../attributes/NetAttributeProvider.js';
import { ReadyAppAttributeProvider } from '../attributes/ReadyAppAttributeProvider.js';
import { ScreenAttributeProvider } from '../attributes/ScreenAttributeProvider.js';
import { WindowEventSubscriber } from '../breadcrumbs/WindowEventSubscriber.js';

export class BacktraceClientBuilder extends NodeBacktraceClientBuilder {
    constructor(clientSetup: BacktraceNodeClientSetup) {
        super(clientSetup);

        this.addAttributeProvider(new ApplicationInformationAttributeProvider());
        this.addAttributeProvider(new GpuAttributeProvider());
        this.addAttributeProvider(new GpuFeatureAttributeProvider());
        this.addAttributeProvider(new ReadyAppAttributeProvider());
        this.addAttributeProvider(new AppAttributeProvider());
        this.addAttributeProvider(new AllWindowsAttributeProvider());
        this.addAttributeProvider(new NetAttributeProvider());
        this.addAttributeProvider(new ScreenAttributeProvider());

        this.useBreadcrumbSubscriber(new WindowEventSubscriber());
    }

    public build(): BacktraceClient {
        const instance = new BacktraceClient(this.clientSetup as BacktraceNodeClientSetup);
        instance.initialize();
        return instance;
    }
}
