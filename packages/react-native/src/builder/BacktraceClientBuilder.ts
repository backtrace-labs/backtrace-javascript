import { BacktraceCoreClientBuilder } from '@backtrace/sdk-core';
import { Platform } from 'react-native';
import { NativeAttributeProvider } from '../attributes/NativeAttributeProvider';
import { ReactNativeAttributeProvider } from '../attributes/ReactNativeAttributeProvider';
import { BacktraceClient } from '../BacktraceClient';
import { AppStateBreadcrumbSubscriber } from '../breadcrumbs/events/AppStateBreadcrumbSubscriber';
import { DimensionChangeBreadcrumbSubscriber } from '../breadcrumbs/events/DimensionChangeBreadcrumbSubscriber';
import { WebRequestEventSubscriber } from '../breadcrumbs/events/WebRequestEventSubscriber';
import { DebuggerHelper } from '../common/DebuggerHelper';
import { ReactNativeFileSystem } from '../storage';
import type { BacktraceClientSetup } from './BacktraceClientSetup';

export class BacktraceClientBuilder extends BacktraceCoreClientBuilder<BacktraceClientSetup> {
    constructor(clientSetup: BacktraceClientSetup) {
        super(clientSetup);

        const debuggerAvailable = DebuggerHelper.isConnected();
        this.addAttributeProvider(new ReactNativeAttributeProvider());
        if (debuggerAvailable) {
            return;
        }

        if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
            return;
        }

        const attributeProviders = Platform.select({
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
        });

        for (const provider of attributeProviders) {
            this.addAttributeProvider(provider);
        }

        this.useFileSystem(new ReactNativeFileSystem());
        this.useBreadcrumbSubscriber(new AppStateBreadcrumbSubscriber());
        this.useBreadcrumbSubscriber(new DimensionChangeBreadcrumbSubscriber());
        this.useBreadcrumbSubscriber(new WebRequestEventSubscriber());
        // this.useBreadcrumbSubscriber(new NativeBreadcrumbSubsriber());
    }

    public useFileSystem(fileSystem: ReactNativeFileSystem): this {
        super.useFileSystem(fileSystem);
        return this;
    }

    public build(): BacktraceClient {
        const instance = new BacktraceClient(this.clientSetup);
        instance.initialize();
        return instance;
    }
}
