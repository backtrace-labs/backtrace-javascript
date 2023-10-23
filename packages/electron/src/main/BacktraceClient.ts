import {
    BacktraceClient as NodeBacktraceClient,
    BacktraceNodeClientSetup,
    BacktraceSetupConfiguration,
} from '@backtrace/node';
import { BacktraceClientBuilder } from './builder/BacktraceClientBuilder';
import { BacktraceMainElectronModule } from './modules/BacktraceMainElectronModule';

export class BacktraceClient extends NodeBacktraceClient {
    constructor(clientSetup: BacktraceNodeClientSetup) {
        super({
            ...clientSetup,
            modules: [new BacktraceMainElectronModule()],
        });
    }

    public static builder(options: BacktraceSetupConfiguration): BacktraceClientBuilder {
        return new BacktraceClientBuilder({ options });
    }

    /**
     * Initializes the client. If the client already exists, the available instance
     * will be returned and all other options will be ignored.
     * @param options client configuration
     * @param build builder
     * @returns backtrace client
     */
    public static initialize(
        options: BacktraceSetupConfiguration,
        build?: (builder: BacktraceClientBuilder) => void,
    ): BacktraceClient {
        if (this.instance) {
            return this.instance;
        }
        const builder = this.builder(options);
        build && build(builder);
        this._instance = builder.build();
        return this._instance as BacktraceClient;
    }
}
