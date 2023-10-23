import { BacktraceClientBuilder as NodeBacktraceClientBuilder, BacktraceNodeClientSetup } from '@backtrace/node';
import { AppAttributeProvider } from '../attributes/AppAttributeProvider';
import { ApplicationInformationAttributeProvider } from '../attributes/ApplicationInformationAttributeProvider';
import { GpuAttributeProvider } from '../attributes/GpuAttributeProvider';
import { GpuFeatureAttributeProvider } from '../attributes/GpuFeatureAttributeProvider';
import { ReadyAppAttributeProvider } from '../attributes/ReadyAppAttributeProvider';
import { BacktraceClient } from '../BacktraceClient';

export class BacktraceClientBuilder extends NodeBacktraceClientBuilder {
    constructor(clientSetup: BacktraceNodeClientSetup) {
        super(clientSetup);

        this.addAttributeProvider(new ApplicationInformationAttributeProvider());
        this.addAttributeProvider(new GpuAttributeProvider());
        this.addAttributeProvider(new GpuFeatureAttributeProvider());
        this.addAttributeProvider(new ReadyAppAttributeProvider());
        this.addAttributeProvider(new AppAttributeProvider());
    }

    public build(): BacktraceClient {
        const instance = new BacktraceClient(this.clientSetup as BacktraceNodeClientSetup);
        instance.initialize();
        return instance;
    }
}
