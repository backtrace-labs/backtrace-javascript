import { BacktraceNodeClientSetup, BacktraceClientBuilder as NodeBacktraceClientBuilder } from '@backtrace/node';
import { BacktraceClient } from '../BacktraceClient';
import { AllWindowsAttributeProvider } from '../attributes/AllWindowsAttributeProvider';
import { AppAttributeProvider } from '../attributes/AppAttributeProvider';
import { ApplicationInformationAttributeProvider } from '../attributes/ApplicationInformationAttributeProvider';
import { GpuAttributeProvider } from '../attributes/GpuAttributeProvider';
import { GpuFeatureAttributeProvider } from '../attributes/GpuFeatureAttributeProvider';
import { NetAttributeProvider } from '../attributes/NetAttributeProvider';
import { ReadyAppAttributeProvider } from '../attributes/ReadyAppAttributeProvider';
import { ScreenAttributeProvider } from '../attributes/ScreenAttributeProvider';
import { WindowEventSubscriber } from '../breadcrumbs/WindowEventSubscriber';

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
