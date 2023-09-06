import { type BacktraceAttributeProvider } from '@backtrace-labs/sdk-core';
import { NativeModules } from 'react-native';

export class DeviceAttributeProvider implements BacktraceAttributeProvider {
    public get type(): 'scoped' | 'dynamic' {
        return 'scoped';
    }
    public get(): Record<string, unknown> {
        if (!NativeModules.BacktraceDeviceAttributeProvider) {
            return {};
        }
        const BacktraceDeviceAttributeProvider = NativeModules.BacktraceDeviceAttributeProvider;

        return {
            culture: BacktraceDeviceAttributeProvider.readCulture(),
            'device.model': BacktraceDeviceAttributeProvider.getDeviceModel(),
            'device.brand': BacktraceDeviceAttributeProvider.getDeviceBrand(),
            'device.product': BacktraceDeviceAttributeProvider.getDeviceProduct(),
            'device.sdk': BacktraceDeviceAttributeProvider.getDeviceSdk(),
            'device.manufacturer': BacktraceDeviceAttributeProvider.getDeviceManufacturer(),
        };
    }
}
