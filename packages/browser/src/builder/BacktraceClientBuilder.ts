import {
    BacktraceAttributeProvider,
    BacktraceCoreClientBuilder,
    BacktraceSessionProvider,
    BacktraceStackTraceConverter,
    BreadcrumbsEventSubscriber,
} from '@backtrace-labs/sdk-core';
import { V8StackTraceConverter } from '@backtrace-labs/sdk-core/lib/modules/converter/V8StackTraceConverter';
import { BacktraceBrowserRequestHandler } from '../BacktraceBrowserRequestHandler';
import { BacktraceBrowserSessionProvider } from '../BacktraceBrowserSessionProvider';
import { BacktraceClient } from '../BacktraceClient';
import { BacktraceConfiguration } from '../BacktraceConfiguration';
import { ApplicationInformationAttributeProvider } from '../attributes/ApplicationInformationAttributeProvider';
import { UserAgentAttributeProvider } from '../attributes/UserAgentAttributeProvider';
import { UserIdentifierAttributeProvider } from '../attributes/UserIdentifierAttributeProvider';
import { WebsiteAttributeProvider } from '../attributes/WebsiteAttributeProvider';
import { WindowAttributeProvider } from '../attributes/WindowAttributeProvider';
import { DocumentEventSubscriber } from '../breadcrumbs/DocumentEventSubscriber';
import { HistoryEventSubscriber } from '../breadcrumbs/HistoryEventSubscriber';
import { WebRequestEventSubscriber } from '../breadcrumbs/WebRequestEventSubscriber';
import { JavaScriptCoreStackTraceConverter } from '../converters/JavaScriptCoreStackTraceConverter';
import { SpiderMonkeyStackTraceConverter } from '../converters/SpiderMonkeyStackTraceConverter';
import { getEngine } from '../engineDetector';

export class BacktraceClientBuilder extends BacktraceCoreClientBuilder<BacktraceClient> {
    constructor(
        protected readonly options: BacktraceConfiguration,
        attributeProviders: BacktraceAttributeProvider[] = [
            new UserAgentAttributeProvider(),
            new WebsiteAttributeProvider(),
            new WindowAttributeProvider(),
            new UserIdentifierAttributeProvider(),
            new ApplicationInformationAttributeProvider(options),
        ],
        breadcrumbsSubscribers: BreadcrumbsEventSubscriber[] = [
            new WebRequestEventSubscriber(),
            new DocumentEventSubscriber(),
            new HistoryEventSubscriber(),
        ],
        sessionProvider: BacktraceSessionProvider = new BacktraceBrowserSessionProvider(),
    ) {
        super(new BacktraceBrowserRequestHandler(options), attributeProviders, breadcrumbsSubscribers, sessionProvider);
    }

    public build(): BacktraceClient {
        return new BacktraceClient(
            this.options,
            this.handler,
            this.attributeProviders,
            this.stackTraceConverter ?? this.generateStackTraceConverter(),
            this.breadcrumbsSubscribers,
            this.sessionProvider,
        ).initialize();
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
