import { BacktraceConfiguration, BacktraceCoreClientBuilder, BacktraceStackTraceConverter } from '@backtrace/sdk-core';
import { V8StackTraceConverter } from '@backtrace/sdk-core/src/modules/converter/V8StackTraceConverter';
import { UserAgentAttributeProvider } from '../attributes/UserAgentAttributeProvider';
import { UserIdentifierAttributeProvider } from '../attributes/UserIdentifierAttributeProvider';
import { WebsiteAttributeProvider } from '../attributes/WebsiteAttributeProvider';
import { WindowAttributeProvider } from '../attributes/WindowAttributeProvider';
import { BacktraceBrowserRequestHandler } from '../BacktraceBrowserRequestHandler';
import { BacktraceClient } from '../BacktraceClient';
import { JavaScriptCoreStackTraceConverter } from '../converters/JavaScriptCoreStackTraceConverter';
import { SpiderMonkeyStackTraceConverter } from '../converters/SpiderMonkeyStackTraceConverter';
import { getEngine } from '../engineDetector';

export class BacktraceClientBuilder extends BacktraceCoreClientBuilder<BacktraceClient> {
    constructor(private readonly _options: BacktraceConfiguration) {
        super(new BacktraceBrowserRequestHandler(_options), [
            new UserAgentAttributeProvider(),
            new WebsiteAttributeProvider(),
            new WindowAttributeProvider(),
            new UserIdentifierAttributeProvider(_options),
        ]);
    }
    public build(): BacktraceClient {
        return new BacktraceClient(
            this._options,
            this.handler,
            this.attributeProviders,
            this.generateStackTraceConverter(),
        );
    }

    private generateStackTraceConverter(): BacktraceStackTraceConverter {
        switch (getEngine()) {
            case 'JavaScriptCore': {
                return new JavaScriptCoreStackTraceConverter();
            }
            case 'SpiderMonkey': {
                return new SpiderMonkeyStackTraceConverter();
            }
            default: {
                return new V8StackTraceConverter();
            }
        }
    }
}
