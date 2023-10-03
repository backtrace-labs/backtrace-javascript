import { BacktraceBrowserRequestHandler } from '@backtrace-labs/react';
import { BacktraceCoreClientBuilder, SingleSessionProvider } from '@backtrace-labs/sdk-core';
import { Platform } from 'react-native';
import { NativeAttributeProvider } from './attributes/NativeAttributeProvider';
import { ReactNativeAttributeProvider } from './attributes/ReactNativeAttributeProvider';
import { BacktraceClient } from './BacktraceClient';
import { type BacktraceConfiguration } from './BacktraceConfiguration';
import { DebuggerHelper } from './common/DebuggerHelper';

export class BacktraceClientBuilder extends BacktraceCoreClientBuilder<BacktraceClient> {
    constructor(private readonly options: BacktraceConfiguration) {
        super(
            new BacktraceBrowserRequestHandler(options),
            [
                new ReactNativeAttributeProvider(),
                ...(DebuggerHelper.isConnected()
                    ? []
                    : Platform.select({
                          ios: [
                              new NativeAttributeProvider('BacktraceApplicationAttributeProvider', 'scoped'),
                              new NativeAttributeProvider('BacktraceDeviceAttributeProvider', 'scoped'),
                              new NativeAttributeProvider('BacktraceSystemAttributeProvider', 'scoped'),
                              new NativeAttributeProvider('BacktraceMemoryUsageAttributeProvider', 'dynamic'),
                              new NativeAttributeProvider('BacktraceCpuAttributeProvider', 'dynamic'),
                          ],
                          android: [
                              new NativeAttributeProvider('BacktraceApplicationAttributeProvider', 'scoped'),
                              new NativeAttributeProvider('BacktraceDeviceAttributeProvider', 'scoped'),
                              new NativeAttributeProvider('BacktraceSystemAttributeProvider', 'scoped'),
                              new NativeAttributeProvider('MemoryInformationAttributeProvider', 'dynamic'),
                              new NativeAttributeProvider('ProcessAttributeProvider', 'dynamic'),
                          ],
                          default: [],
                      })),
            ],
            [],
            new SingleSessionProvider(),
        );
    }
    public build(): BacktraceClient {
        return new BacktraceClient(this.options, this.handler, this.attributeProviders, this.breadcrumbsSubscribers);
    }
}
