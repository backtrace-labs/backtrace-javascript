import { BacktraceCoreClientBuilder } from '@backtrace-labs/sdk-core';
import { BacktraceClient } from '../BacktraceClient';
import { ApplicationInformationAttributeProvider } from '../attributes/ApplicationInformationAttributeProvider';
import { UserAgentAttributeProvider } from '../attributes/UserAgentAttributeProvider';
import { UserIdentifierAttributeProvider } from '../attributes/UserIdentifierAttributeProvider';
import { WebsiteAttributeProvider } from '../attributes/WebsiteAttributeProvider';
import { WindowAttributeProvider } from '../attributes/WindowAttributeProvider';
import { DocumentEventSubscriber } from '../breadcrumbs/DocumentEventSubscriber';
import { HistoryEventSubscriber } from '../breadcrumbs/HistoryEventSubscriber';
import { WebRequestEventSubscriber } from '../breadcrumbs/WebRequestEventSubscriber';
import { BacktraceClientSetup } from './BacktraceClientSetup';

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
