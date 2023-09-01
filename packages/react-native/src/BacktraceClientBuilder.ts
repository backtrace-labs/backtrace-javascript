import { BacktraceBrowserRequestHandler } from '@backtrace-labs/react';
import { BacktraceCoreClientBuilder, SingleSessionProvider } from '@backtrace-labs/sdk-core';
import { ApplicationInformationAttributeProvider } from './attributes/ApplicationInformationAttributeProvider';
import { DeviceAttributeProvider } from './attributes/DeviceAttributeProvider';
import { BacktraceClient } from './BacktraceClient';
import { type BacktraceConfiguration } from './BacktraceConfiguration';

export class BacktraceClientBuilder extends BacktraceCoreClientBuilder<BacktraceClient> {
    constructor(private readonly options: BacktraceConfiguration) {
        super(
            new BacktraceBrowserRequestHandler(options),
            [new ApplicationInformationAttributeProvider(), new DeviceAttributeProvider()],
            [],
            new SingleSessionProvider(),
        );
    }
    public build(): BacktraceClient {
        return new BacktraceClient(this.options, this.handler, this.attributeProviders, this.breadcrumbsSubscribers);
    }
}
