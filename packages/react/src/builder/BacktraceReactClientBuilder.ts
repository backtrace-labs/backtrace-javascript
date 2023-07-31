import { BacktraceClientBuilder } from '@backtrace/browser';
import { BacktraceClient } from '../BacktraceClient';
import { ReactStackTraceConverter } from '../converters/ReactStackTraceConverter';

export class BacktraceReactClientBuilder extends BacktraceClientBuilder {
    public build(): BacktraceClient {
        return new BacktraceClient(
            this._options,
            this.handler,
            this.attributeProviders,
            new ReactStackTraceConverter(this.generateStackTraceConverter()),
        );
    }
}
