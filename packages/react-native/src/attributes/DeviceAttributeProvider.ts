import { type BacktraceAttributeProvider } from '@backtrace-labs/sdk-core';
import { NativeModules } from 'react-native';

export class DeviceAttributeProvider implements BacktraceAttributeProvider {
    public get type(): 'scoped' | 'dynamic' {
        return 'scoped';
    }
    public get(): Record<string, unknown> {
        const attributeProvider = NativeModules.BacktraceDeviceAttributeProvider;
        if (!attributeProvider) {
            return {};
        }

        return {
            culture: attributeProvider.readCulture(),
            'device.model': attributeProvider.getDeviceModel(),
            'device.brand': attributeProvider.getDeviceBrand(),
            'device.product': attributeProvider.getDeviceProduct(),
            'device.sdk': attributeProvider.getDeviceSdk(),
            'device.manufacturer': attributeProvider.getDeviceManufacturer(),
        };
    }
}
