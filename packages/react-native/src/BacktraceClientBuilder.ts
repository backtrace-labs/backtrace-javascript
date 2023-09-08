import { BacktraceBrowserRequestHandler } from '@backtrace-labs/react';
import { BacktraceCoreClientBuilder, SingleSessionProvider } from '@backtrace-labs/sdk-core';
import { Platform } from 'react-native';
import { DeviceAttributeProvider } from './attributes/android/DeviceAttributeProvider';
import { SystemAttributeProvider } from './attributes/android/SystemAttributeProvider';
import { ApplicationInformationAttributeProvider } from './attributes/ApplicationInformationAttributeProvider';
import { BacktraceClient } from './BacktraceClient';
import { type BacktraceConfiguration } from './BacktraceConfiguration';

export class BacktraceClientBuilder extends BacktraceCoreClientBuilder<BacktraceClient> {
    constructor(private readonly options: BacktraceConfiguration) {
        super(
            new BacktraceBrowserRequestHandler(options),
            Platform.select({
                ios: [new ApplicationInformationAttributeProvider()],
                android: [
                    new ApplicationInformationAttributeProvider(),
                    new DeviceAttributeProvider(),
                    new SystemAttributeProvider(),
                ],
                default: [],
            }),
            [],
            new SingleSessionProvider(),
        );
    }
    public build(): BacktraceClient {
        return new BacktraceClient(this.options, this.handler, this.attributeProviders, this.breadcrumbsSubscribers);
    }
}
