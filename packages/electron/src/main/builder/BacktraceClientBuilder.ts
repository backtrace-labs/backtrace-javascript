import { BacktraceNodeClientSetup, BacktraceClientBuilder as NodeBacktraceClientBuilder } from '@backtrace-labs/node';
import { BacktraceClient } from '../BacktraceClient';
import { ApplicationInformationAttributeProvider } from '../attributes/ApplicationInformationAttributeProvider';

export class BacktraceClientBuilder extends NodeBacktraceClientBuilder {
    constructor(clientSetup: BacktraceNodeClientSetup) {
        super(clientSetup);

        this.addAttributeProvider(new ApplicationInformationAttributeProvider());
    }

    public build(): BacktraceClient {
        const instance = new BacktraceClient(this.clientSetup as BacktraceNodeClientSetup);
        instance.initialize();
        return instance;
    }
}
