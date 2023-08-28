import { BacktraceClient as BacktraceReactClient } from '@backtrace-labs/react';
import { BacktraceClientBuilder } from './BacktraceClientBuilder';
import { type BacktraceConfiguration } from './BacktraceConfiguration';

export class BacktraceClient extends BacktraceReactClient {
    public static builder(options: BacktraceConfiguration): BacktraceClientBuilder {
        return new BacktraceClientBuilder(options);
    }
    /**
     * Initializes the client. If the client already exists, the available instance
     * will be returned and all other options will be ignored.
     * @param options client configuration
     * @param build builder
     * @returns backtrace client
     */
    public static initialize(options: BacktraceConfiguration, build?: (builder: BacktraceClientBuilder) => void) {
        if (this._instance) {
            return this._instance;
        }
        const builder = this.builder(options);
        build && build(builder);
        this._instance = builder.build();
        return this._instance;
    }

    /**
     * Returns created BacktraceClient instance if the instance exists.
     * Otherwise undefined.
     */
    public static get instance(): BacktraceClient | undefined {
        return this._instance;
    }
}
