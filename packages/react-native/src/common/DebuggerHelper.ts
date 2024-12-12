import { NativeModules } from 'react-native';

export class DebuggerHelper {
    /**
     * Detects if the native bridge between JavaScript and native is available.
     * @returns true if the native bridge is available. Otherwise false.
     */
    public static isNativeBridgeEnabled(): boolean {
        // in the bridgeless mode, we always have access to the native layer - there is no risk
        // on returning true.
        const isBridgeless = !NativeModules.UIManager;
        if (isBridgeless) {
            return true;
        }

        return !!(global as unknown as { nativeCallSyncHook: boolean }).nativeCallSyncHook;
    }
}
