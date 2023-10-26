import { BacktraceNodeClientSetup, BacktraceClientBuilder as NodeBacktraceClientBuilder } from '@backtrace/node';
import { BacktraceClient } from '../BacktraceClient';
import { AllWindowsAttributeProvider } from '../attributes/AllWindowsAttributeProvider';
import { AppAttributeProvider } from '../attributes/AppAttributeProvider';
import { ApplicationInformationAttributeProvider } from '../attributes/ApplicationInformationAttributeProvider';
import { GpuAttributeProvider } from '../attributes/GpuAttributeProvider';
import { GpuFeatureAttributeProvider } from '../attributes/GpuFeatureAttributeProvider';
import { ReadyAppAttributeProvider } from '../attributes/ReadyAppAttributeProvider';

export class BacktraceClientBuilder extends NodeBacktraceClientBuilder {
    constructor(clientSetup: BacktraceNodeClientSetup) {
        super(clientSetup);

        this.addAttributeProvider(new ApplicationInformationAttributeProvider());
        this.addAttributeProvider(new GpuAttributeProvider());
        this.addAttributeProvider(new GpuFeatureAttributeProvider());
        this.addAttributeProvider(new ReadyAppAttributeProvider());
        this.addAttributeProvider(new AppAttributeProvider());
        this.addAttributeProvider(new AllWindowsAttributeProvider());
    }

    public build(): BacktraceClient {
        const instance = new BacktraceClient(this.clientSetup as BacktraceNodeClientSetup);
        instance.initialize();
        return instance;
    }
}
