import type { ExceptionsManager } from '../src/common/exceptionsManagerHelper';

const EXCEPTIONS_MANAGER = 'react-native/Libraries/Core/ExceptionsManager';

function resolveWith(factory: () => unknown) {
    let resolved: { manager?: ExceptionsManager; module?: unknown } = {};
    try {
        jest.isolateModules(() => {
            jest.doMock(EXCEPTIONS_MANAGER, factory);
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { exceptionsManager } = require('../src/common/exceptionsManagerHelper');
            resolved = { manager: exceptionsManager() };
            try {
                resolved.module = require(EXCEPTIONS_MANAGER);
            } catch {
                // The missing module case.
            }
        });
    } finally {
        jest.dontMock(EXCEPTIONS_MANAGER);
    }
    return resolved;
}

describe('exceptionsManager', () => {
    it('Should return the module object when React Native exports it with module.exports', () => {
        const { manager, module } = resolveWith(() => ({ handleException: jest.fn() }));

        expect(manager).toBe(module);
    });

    it('Should return the default export when React Native exports it as an ES module', () => {
        const { manager, module } = resolveWith(() => ({ __esModule: true, default: { handleException: jest.fn() } }));

        expect(manager).toBe((module as { default: unknown }).default);
    });

    it('Should return nothing when the module has no handleException', () => {
        expect(resolveWith(() => ({ default: {} })).manager).toBeUndefined();
    });

    it('Should return nothing when the module cannot be loaded', () => {
        const { manager } = resolveWith(() => {
            throw new Error('Cannot find module');
        });

        expect(manager).toBeUndefined();
    });

    it("Should return React Native's own ExceptionsManager", () => {
        /* eslint-disable @typescript-eslint/no-var-requires */
        const { exceptionsManager } = require('../src/common/exceptionsManagerHelper');
        const reactNativeExceptionsManager = require(EXCEPTIONS_MANAGER).default;
        /* eslint-enable @typescript-eslint/no-var-requires */

        expect(exceptionsManager()).toBe(reactNativeExceptionsManager);
    });
});
