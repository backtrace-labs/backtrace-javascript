export interface ExceptionsManager {
    handleException(error: unknown, isFatal: boolean): void;
}

type ExceptionsManagerModule = Partial<ExceptionsManager> & { default?: Partial<ExceptionsManager> };

export function exceptionsManager(): ExceptionsManager | undefined {
    let exported: ExceptionsManagerModule | undefined;
    try {
        // Metro bundles a missing module as optional only when its require sits directly inside a try block.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        exported = require('react-native/Libraries/Core/ExceptionsManager');
    } catch {
        return undefined;
    }

    const manager = typeof exported?.default?.handleException === 'function' ? exported.default : exported;
    return typeof manager?.handleException === 'function' ? (manager as ExceptionsManager) : undefined;
}
