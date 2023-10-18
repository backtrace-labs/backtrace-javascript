import { BacktraceCoreClientBuilder } from '@backtrace-labs/sdk-core';
import { Platform } from 'react-native';
import { NativeAttributeProvider } from '../attributes/NativeAttributeProvider';
import { ReactNativeAttributeProvider } from '../attributes/ReactNativeAttributeProvider';
import { BacktraceClient } from '../BacktraceClient';
import { DebuggerHelper } from '../common/DebuggerHelper';
import { ReactNativeFileSystem } from '../storage';
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
        if ((Platform.OS === 'android' || Platform.OS === 'ios') && !DebuggerHelper.isConnected()) {
            this.useFileSystem(new ReactNativeFileSystem());
        }
    }

    public useFileSystem(fileSystem: ReactNativeFileSystem): this {
        super.useFileSystem(fileSystem);
        return this;
    }

    public build(): BacktraceClient {
        return new BacktraceClient(this.clientSetup);
    }
}
