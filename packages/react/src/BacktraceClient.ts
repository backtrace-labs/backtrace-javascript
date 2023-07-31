import { BacktraceConfiguration, BacktraceClient as BrowserClient } from '@backtrace/browser';
import { BacktraceReactClientBuilder } from './builder/BacktraceReactClientBuilder';

export class BacktraceClient extends BrowserClient {
    private static _instance?: BacktraceClient;

    public static builder(options: BacktraceConfiguration): BacktraceReactClientBuilder {
        return new BacktraceReactClientBuilder(options);
    }

    public static initialize(options: BacktraceConfiguration): BacktraceClient {
        this._instance = this.builder(options).build();
        return this._instance;
    }

    public static get instance(): BacktraceClient {
        if (!this._instance) {
            throw new Error('BacktraceClient is uninitialized. Call "BacktraceClient.initialize" function first.');
        }
        return this._instance;
    }
}
