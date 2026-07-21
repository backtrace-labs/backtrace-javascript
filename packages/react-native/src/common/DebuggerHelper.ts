import { NativeModules } from 'react-native';

export class DebuggerHelper {
    /**
     * Detects if the native bridge between JavaScript and native is available.
     * @returns true if the native bridge is available. Otherwise false.
     */
    public static isNativeBridgeEnabled(): boolean {
        const globals = globalThis as unknown as {
            RN$Bridgeless?: boolean;
            nativeCallSyncHook?: boolean;
        };

        // in the bridgeless mode (New Architecture), we always have access to the native
        // layer - there is no risk on returning true. RN exposes `RN$Bridgeless` on the
        // global object as the canonical signal; `NativeModules.UIManager` is unreliable
        // here because it is still present via the interop layer in RN >= 0.77.
        const isBridgeless = globals.RN$Bridgeless === true || !NativeModules.UIManager;
        if (isBridgeless) {
            return true;
        }

        return !!globals.nativeCallSyncHook;
    }
}
