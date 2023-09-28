export class DebuggerHelper {
    public static isConnected(): boolean {
        return !(global as unknown as { nativeCallSyncHook: boolean }).nativeCallSyncHook;
    }
}
