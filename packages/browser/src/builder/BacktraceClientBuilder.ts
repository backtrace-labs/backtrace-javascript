import { BacktraceCoreClientBuilder, BacktraceStackTraceConverter } from '@backtrace/sdk-core';
import { V8StackTraceConverter } from '@backtrace/sdk-core/lib/modules/converter/V8StackTraceConverter';
import { ApplicationInformationAttributeProvider } from '../attributes/ApplicationInformationAttributeProvider';
import { UserAgentAttributeProvider } from '../attributes/UserAgentAttributeProvider';
import { UserIdentifierAttributeProvider } from '../attributes/UserIdentifierAttributeProvider';
import { WebsiteAttributeProvider } from '../attributes/WebsiteAttributeProvider';
import { WindowAttributeProvider } from '../attributes/WindowAttributeProvider';
import { BacktraceBrowserRequestHandler } from '../BacktraceBrowserRequestHandler';
import { BacktraceClient } from '../BacktraceClient';
import { BacktraceConfiguration } from '../BacktraceConfiguration';
import { DocumentEventSubscriber } from '../breadcrumbs/DocumentEventSubscriber';
import { HistoryEventSubscriber } from '../breadcrumbs/HistoryEventSubscriber';
import { WebRequestEventSubscriber } from '../breadcrumbs/WebRequestEventSubscriber';
import { JavaScriptCoreStackTraceConverter } from '../converters/JavaScriptCoreStackTraceConverter';
import { SpiderMonkeyStackTraceConverter } from '../converters/SpiderMonkeyStackTraceConverter';
import { getEngine } from '../engineDetector';

export class BacktraceClientBuilder extends BacktraceCoreClientBuilder<BacktraceClient> {
    constructor(protected readonly options: BacktraceConfiguration) {
        super(
            new BacktraceBrowserRequestHandler(options),
            [
                new UserAgentAttributeProvider(),
                new WebsiteAttributeProvider(),
                new WindowAttributeProvider(),
                new UserIdentifierAttributeProvider(options),
                new ApplicationInformationAttributeProvider(options),
            ],
            [new WebRequestEventSubscriber(), new DocumentEventSubscriber(), new HistoryEventSubscriber()],
        );
    }

    public build(): BacktraceClient {
        return new BacktraceClient(
            this.options,
            this.handler,
            this.attributeProviders,
            this.generateStackTraceConverter(),
            this.breadcrumbSubscribers,
        );
    }

    protected generateStackTraceConverter(): BacktraceStackTraceConverter {
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
