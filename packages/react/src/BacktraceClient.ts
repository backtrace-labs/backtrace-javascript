import { BacktraceClient as BrowserClient, BacktraceConfiguration } from '@backtrace/browser';
import { BacktraceReactClientBuilder } from './builder/BacktraceReactClientBuilder';

export class BacktraceClient extends BrowserClient {
    public static builder(options: BacktraceConfiguration): BacktraceReactClientBuilder {
        return new BacktraceReactClientBuilder(options);
    }

    public static initialize(options: BacktraceConfiguration, build?: (builder: BacktraceReactClientBuilder) => void) {
        if (this._instance) {
            return this._instance;
        }
        const builder = this.builder(options);
        build && build(builder);
        this._instance = builder.build().initialize();
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
