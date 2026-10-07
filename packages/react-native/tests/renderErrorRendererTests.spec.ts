import type { BacktraceReport } from '@backtrace/sdk-core';
import type * as ReactTypes from 'react';
import type { BacktraceClient } from '../src/BacktraceClient';

type NativeException = { isFatal: boolean; message: string };

const mockNativeExceptions: NativeException[] = [];

jest.mock('react-native/Libraries/Core/NativeExceptionsManager', () => ({
    __esModule: true,
    default: {
        reportException: (data: NativeException) => mockNativeExceptions.push(data),
    },
}));

jest.mock('promise/setimmediate/rejection-tracking', () => ({
    enable: jest.fn(),
}));

jest.mock('../src/crashReporter/CrashReporter', () => ({
    CrashReporter: { markFatalError: jest.fn() },
}));

(global as unknown as { __DEV__: boolean }).__DEV__ = false;
Object.assign((global as unknown as { nativeFabricUIManager: object }).nativeFabricUIManager, {
    createChildSet: () => [],
    appendChildToSet: (set: unknown[], child: unknown) => set.push(child),
    completeRoot: () => undefined,
});

/* eslint-disable @typescript-eslint/no-var-requires */
const React = require('react') as typeof ReactTypes;
const { renderElement } = require('react-native/Libraries/ReactNative/RendererImplementation');
const ExceptionsManager = require('react-native/Libraries/Core/ExceptionsManager').default;
const ReactFiberErrorDialog = require('react-native/Libraries/Core/ReactFiberErrorDialog').default;
const { CrashReporter } = require('../src/crashReporter/CrashReporter');
const { UnhandledExceptionHandler } = require('../src/handlers/UnhandledExceptionHandler');
/* eslint-enable @typescript-eslint/no-var-requires */

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function Bomb(): ReactTypes.ReactElement {
    throw new Error('render boom');
}

class Boundary extends React.Component<{ children: ReactTypes.ReactNode }, { failed: boolean }> {
    state = { failed: false };

    static getDerivedStateFromError() {
        return { failed: true };
    }

    render() {
        return this.state.failed ? null : this.props.children;
    }
}

describe('Render errors through the React Native renderer', () => {
    let sendMock: jest.Mock;
    let handler: InstanceType<typeof UnhandledExceptionHandler>;
    let originalErrorUtils: unknown;
    let consoleError: jest.SpyInstance;
    let globalHandler: (error: unknown, fatal?: boolean) => void;
    let rootTag = 1;

    beforeEach(() => {
        mockNativeExceptions.length = 0;
        (CrashReporter.markFatalError as jest.Mock).mockClear();
        sendMock = jest.fn().mockResolvedValue(undefined);
        consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

        originalErrorUtils = (global as unknown as { ErrorUtils?: unknown }).ErrorUtils;
        (global as unknown as { ErrorUtils: unknown }).ErrorUtils = {
            getGlobalHandler: () => (error: unknown, fatal: boolean) => ExceptionsManager.handleException(error, fatal),
            setGlobalHandler: (fn: typeof globalHandler) => {
                globalHandler = fn;
            },
        };

        handler = new UnhandledExceptionHandler();
        handler.captureManagedErrors({ send: sendMock } as unknown as BacktraceClient);
    });

    afterEach(() => {
        handler.dispose();
        consoleError.mockRestore();
        delete (global as unknown as { RN$handleException?: unknown }).RN$handleException;
        (global as unknown as { ErrorUtils: unknown }).ErrorUtils = originalErrorUtils;
    });

    async function render(element: ReactTypes.ReactElement, useFabric: boolean) {
        rootTag += 10;
        renderElement({ element, rootTag, useFabric, useConcurrentRoot: useFabric });
        await wait(50);
    }

    it.each([
        ['the old architecture renderer', false, false],
        ['the New Architecture renderer', true, false],
        ['the New Architecture renderer with the bridgeless error handler', true, true],
    ])(
        'Should report an uncaught render error once with its component stack before React Native crashes the app on %s',
        async (_name, useFabric, bridgeless) => {
            const bridgelessHandler = jest.fn(() => false);
            if (bridgeless) {
                (global as unknown as { RN$handleException: unknown }).RN$handleException = bridgelessHandler;
            }

            await render(React.createElement(Bomb), useFabric);

            expect(sendMock).toHaveBeenCalledTimes(1);
            const report = sendMock.mock.calls[0][0] as BacktraceReport;
            expect((report.data as Error).message).toBe('render boom');
            expect(report.attributes).toMatchObject({ 'error.type': 'Unhandled exception', fatal: true });
            expect(report.stackTrace['component-stack']).toMatchObject({ stack: expect.stringContaining('Bomb') });

            expect(mockNativeExceptions).toHaveLength(1);
            expect(mockNativeExceptions[0].isFatal).toBe(true);
            expect(CrashReporter.markFatalError).toHaveBeenCalledTimes(1);
            expect(bridgelessHandler).toHaveBeenCalledTimes(bridgeless ? 1 : 0);
        },
    );

    it.each([
        ['the old architecture renderer', false],
        ['the New Architecture renderer', true],
    ])('Should leave a render error caught by an error boundary unreported on %s', async (_name, useFabric) => {
        await render(React.createElement(Boundary, null, React.createElement(Bomb)), useFabric);

        expect(sendMock).not.toHaveBeenCalled();
        expect(CrashReporter.markFatalError).not.toHaveBeenCalled();
        expect(mockNativeExceptions).toHaveLength(1);
        expect(mockNativeExceptions[0].isFatal).toBe(false);
    });

    it('Should report a React 18 render error once when the renderer rethrows it to the global error handler', async () => {
        const error = new Error('react 18 boom');

        ReactFiberErrorDialog.showErrorDialog({ componentStack: '\n    in Bomb', error, errorBoundary: null });
        globalHandler(error, true);
        await wait(50);

        expect(sendMock).toHaveBeenCalledTimes(1);
        const report = sendMock.mock.calls[0][0] as BacktraceReport;
        expect(report.data).toBe(error);
        expect(report.stackTrace['component-stack']).toMatchObject({ stack: '\n    in Bomb' });
        expect(mockNativeExceptions.map((exception) => exception.isFatal)).toEqual([false, true]);
    });
});
