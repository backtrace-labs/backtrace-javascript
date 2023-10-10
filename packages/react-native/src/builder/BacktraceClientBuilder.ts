import { BacktraceCoreClientBuilder } from '@backtrace-labs/sdk-core';
import { Platform } from 'react-native';
import { BacktraceClient } from '../BacktraceClient';
import { NativeAttributeProvider } from '../attributes/NativeAttributeProvider';
import { ReactNativeAttributeProvider } from '../attributes/ReactNativeAttributeProvider';
import { DebuggerHelper } from '../common/DebuggerHelper';
import type { BacktraceClientSetup } from './BacktraceClientSetup';

export class BacktraceClientBuilder extends BacktraceCoreClientBuilder<BacktraceClientSetup> {
    constructor(clientSetup: BacktraceClientSetup) {
        super(clientSetup);

        const attributeProviders = [
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
        ];

        for (const provider of attributeProviders) {
            this.addAttributeProvider(provider);
        }
    }
    public build(): BacktraceClient {
        return new BacktraceClient(this.clientSetup);
    }
}
