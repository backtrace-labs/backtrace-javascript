import { BacktraceClientBuilder, BacktraceClientSetup } from '@backtrace/browser';
import { BacktraceClient } from '../BacktraceClient.js';

export class BacktraceReactClientBuilder extends BacktraceClientBuilder {
    constructor(clientSetup: BacktraceClientSetup) {
        super(clientSetup);
    }

    public build(): BacktraceClient {
        const instance = new BacktraceClient(this.clientSetup);
        instance.initialize();
        return instance;
    }
}
