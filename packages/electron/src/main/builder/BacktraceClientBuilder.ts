import { BacktraceNodeClientSetup, BacktraceClientBuilder as NodeBacktraceClientBuilder } from '@backtrace-labs/node';
import { BacktraceClient } from '../BacktraceClient';

export class BacktraceClientBuilder extends NodeBacktraceClientBuilder {
    public build(): BacktraceClient {
        const instance = new BacktraceClient(this.clientSetup as BacktraceNodeClientSetup);
        instance.initialize();
        return instance;
    }
}
