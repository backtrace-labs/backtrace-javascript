import { BacktraceCoreClientBuilder } from '@backtrace/sdk-core';
import { ApplicationInformationAttributeProvider } from '../attributes/ApplicationInformationAttributeProvider.js';
import { UserAgentAttributeProvider } from '../attributes/UserAgentAttributeProvider.js';
import { UserIdentifierAttributeProvider } from '../attributes/UserIdentifierAttributeProvider.js';
import { WebsiteAttributeProvider } from '../attributes/WebsiteAttributeProvider.js';
import { WindowAttributeProvider } from '../attributes/WindowAttributeProvider.js';
import { BacktraceClient } from '../BacktraceClient.js';
import { DocumentEventSubscriber } from '../breadcrumbs/DocumentEventSubscriber.js';
import { HistoryEventSubscriber } from '../breadcrumbs/HistoryEventSubscriber.js';
import { WebRequestEventSubscriber } from '../breadcrumbs/WebRequestEventSubscriber.js';
import { BacktraceClientSetup } from './BacktraceClientSetup.js';

export class BacktraceClientBuilder extends BacktraceCoreClientBuilder<BacktraceClientSetup> {
    constructor(clientSetup: BacktraceClientSetup) {
        super(clientSetup);

        this.addAttributeProvider(new UserAgentAttributeProvider());
        this.addAttributeProvider(new WebsiteAttributeProvider());
        this.addAttributeProvider(new WindowAttributeProvider());
        this.addAttributeProvider(new UserIdentifierAttributeProvider());
        this.addAttributeProvider(new ApplicationInformationAttributeProvider(clientSetup.options));

        this.useBreadcrumbSubscriber(new WebRequestEventSubscriber());
        this.useBreadcrumbSubscriber(new DocumentEventSubscriber());
        this.useBreadcrumbSubscriber(new HistoryEventSubscriber());
    }

    public build(): BacktraceClient {
        const instance = new BacktraceClient(this.clientSetup);
        instance.initialize();
        return instance as BacktraceClient;
    }
}
