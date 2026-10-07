import { BacktraceReport } from '@backtrace/sdk-core';
import type { BacktraceClient } from '../src/BacktraceClient';
import type { ExceptionsManager } from '../src/common/exceptionsManagerHelper';

jest.mock('promise/setimmediate/rejection-tracking', () => ({
    enable: jest.fn(),
}));

jest.mock('../src/crashReporter/CrashReporter', () => ({
    CrashReporter: { markFatalError: jest.fn() },
}));

const mockExceptionsManager: { current?: ExceptionsManager } = {};

jest.mock('../src/common/exceptionsManagerHelper', () => ({
    exceptionsManager: () => mockExceptionsManager.current,
}));

import { CrashReporter } from '../src/crashReporter/CrashReporter';
import { UnhandledExceptionHandler } from '../src/handlers/UnhandledExceptionHandler';

const markFatalErrorMock = CrashReporter.markFatalError as jest.Mock;

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

function renderError(message: string, componentStack = '\n    in Bomb\n    in App') {
    return Object.assign(new Error(message), { componentStack, isComponentError: true });
}

describe('UnhandledExceptionHandler render errors', () => {
    let sendMock: jest.Mock;
    let client: BacktraceClient;
    let handler: UnhandledExceptionHandler;
    let originalHandleException: jest.Mock;
    let manager: ExceptionsManager;
    let globalHandler: (error: Error, fatal?: boolean) => void;
    let reactNativeGlobalHandler: jest.Mock;
    let originalErrorUtils: unknown;
    let originalDev: PropertyDescriptor | undefined;

    beforeEach(() => {
        originalDev = Object.getOwnPropertyDescriptor(globalThis, '__DEV__');
        Object.defineProperty(globalThis, '__DEV__', { configurable: true, value: false });
        markFatalErrorMock.mockClear();
        sendMock = jest.fn().mockResolvedValue(undefined);
        client = { send: sendMock } as unknown as BacktraceClient;
        handler = new UnhandledExceptionHandler();

        originalHandleException = jest.fn();
        manager = { handleException: originalHandleException };
        mockExceptionsManager.current = manager;

        reactNativeGlobalHandler = jest.fn((error: Error, fatal?: boolean) => manager.handleException(error, !!fatal));
        originalErrorUtils = (global as unknown as { ErrorUtils?: unknown }).ErrorUtils;
        (global as unknown as { ErrorUtils: unknown }).ErrorUtils = {
            getGlobalHandler: () => reactNativeGlobalHandler,
            setGlobalHandler: (fn: typeof globalHandler) => {
                globalHandler = fn;
            },
        };
    });

    afterEach(() => {
        handler.dispose();
        (global as unknown as { ErrorUtils: unknown }).ErrorUtils = originalErrorUtils;
        if (originalDev) {
            Object.defineProperty(globalThis, '__DEV__', originalDev);
        } else {
            Reflect.deleteProperty(globalThis, '__DEV__');
        }
    });

    it('Should report an uncaught render error once with its component stack and forward it after the report settles', async () => {
        let resolveSend!: () => void;
        sendMock.mockReturnValue(
            new Promise<void>((resolve) => {
                resolveSend = resolve;
            }),
        );
        handler.captureManagedErrors(client);
        const error = renderError('render boom');

        manager.handleException(error, true);

        expect(sendMock).toHaveBeenCalledTimes(1);
        const report = sendMock.mock.calls[0][0] as BacktraceReport;
        expect(report).toBeInstanceOf(BacktraceReport);
        expect(report.data).toBe(error);
        expect(report.attributes).toMatchObject({ 'error.type': 'Unhandled exception', fatal: true });
        expect(report.stackTrace['component-stack']).toEqual({ stack: '\n    in Bomb\n    in App', message: '' });
        expect(originalHandleException).not.toHaveBeenCalled();

        resolveSend();
        await flush();

        expect(originalHandleException).toHaveBeenCalledTimes(1);
        expect(originalHandleException).toHaveBeenCalledWith(error, true);
        expect(markFatalErrorMock).toHaveBeenCalledTimes(1);
        expect(markFatalErrorMock.mock.invocationCallOrder[0]).toBeLessThan(
            originalHandleException.mock.invocationCallOrder[0],
        );
    });

    it('Should report an uncaught render error and forward it at once without marking it in a debug build', () => {
        Object.defineProperty(globalThis, '__DEV__', { configurable: true, value: true });
        sendMock.mockReturnValue(new Promise<void>(() => undefined));
        handler.captureManagedErrors(client);
        const error = renderError('render boom');

        manager.handleException(error, true);

        expect(sendMock).toHaveBeenCalledTimes(1);
        expect(markFatalErrorMock).not.toHaveBeenCalled();
        expect(originalHandleException).toHaveBeenCalledWith(error, true);
    });

    it('Should forward a render error caught by an error boundary without reporting it', () => {
        handler.captureManagedErrors(client);
        const error = renderError('caught');

        manager.handleException(error, false);

        expect(sendMock).not.toHaveBeenCalled();
        expect(originalHandleException).toHaveBeenCalledWith(error, false);
    });

    it('Should leave fatal errors that are not render errors to the global error handler', () => {
        handler.captureManagedErrors(client);
        const error = new Error('plain fatal');

        manager.handleException(error, true);

        expect(sendMock).not.toHaveBeenCalled();
        expect(markFatalErrorMock).not.toHaveBeenCalled();
        expect(originalHandleException).toHaveBeenCalledWith(error, true);
    });

    it('Should report a React 18 render error once when the renderer rethrows it to the global error handler', async () => {
        handler.captureManagedErrors(client);
        const error = renderError('react 18 boom');

        manager.handleException(error, false);
        globalHandler(error, true);
        await flush();

        expect(sendMock).toHaveBeenCalledTimes(1);
        expect((sendMock.mock.calls[0][0] as BacktraceReport).stackTrace['component-stack']).toBeDefined();
        expect(originalHandleException.mock.calls).toEqual([
            [error, false],
            [error, true],
        ]);
    });

    it('Should mark a reported fatal error again when another handler delays React Native', async () => {
        reactNativeGlobalHandler.mockImplementation((error: Error, fatal?: boolean) => {
            setTimeout(() => manager.handleException(error, !!fatal), 10);
        });
        handler.captureManagedErrors(client);
        const error = new Error('boom');

        globalHandler(error, true);
        await flush();
        expect(markFatalErrorMock).toHaveBeenCalledTimes(1);
        expect(originalHandleException).not.toHaveBeenCalled();

        await new Promise((resolve) => setTimeout(resolve, 20));

        expect(sendMock).toHaveBeenCalledTimes(1);
        expect(markFatalErrorMock).toHaveBeenCalledTimes(2);
        expect(originalHandleException).toHaveBeenCalledWith(error, true);
        expect(markFatalErrorMock.mock.invocationCallOrder[1]).toBeLessThan(
            originalHandleException.mock.invocationCallOrder[0],
        );
    });

    it('Should forward a reported fatal error without reporting it again after the client is initialized again', async () => {
        handler.captureManagedErrors(client);
        const error = new Error('boom');
        globalHandler(error, true);
        await flush();

        handler.dispose();
        handler = new UnhandledExceptionHandler();
        handler.captureManagedErrors(client);
        sendMock.mockClear();
        markFatalErrorMock.mockClear();
        reactNativeGlobalHandler.mockClear();

        globalHandler(error, true);

        expect(sendMock).not.toHaveBeenCalled();
        expect(markFatalErrorMock).toHaveBeenCalled();
        expect(reactNativeGlobalHandler).toHaveBeenCalledWith(error, true);
        expect(originalHandleException).toHaveBeenLastCalledWith(error, true);
    });

    it('Should not report a pending render error again after the client is disposed and initialized again', async () => {
        handler.captureManagedErrors(client);
        const error = renderError('react 18 boom');
        globalHandler(error, true);

        handler.dispose();
        handler = new UnhandledExceptionHandler();
        handler.captureManagedErrors(client);
        await flush();

        expect(sendMock).toHaveBeenCalledTimes(1);
        expect(originalHandleException).toHaveBeenCalledWith(error, true);
    });

    it('Should restore the original handler on dispose', () => {
        handler.captureManagedErrors(client);

        handler.dispose();

        expect(manager.handleException).toBe(originalHandleException);
    });

    it('Should keep a wrapper installed on top of ours and only forward through it after dispose', () => {
        handler.captureManagedErrors(client);
        const ours = manager.handleException;
        const outer = jest.fn((error: unknown, isFatal: boolean) => ours.call(manager, error, isFatal));
        manager.handleException = outer;

        handler.dispose();
        const error = renderError('after dispose');
        manager.handleException(error, true);

        expect(manager.handleException).toBe(outer);
        expect(sendMock).not.toHaveBeenCalled();
        expect(originalHandleException).toHaveBeenCalledWith(error, true);
    });

    it('Should keep capturing global errors when the ExceptionsManager is unavailable', () => {
        mockExceptionsManager.current = undefined;

        handler.captureManagedErrors(client);
        globalHandler(new Error('boom'), false);

        expect(sendMock).toHaveBeenCalledTimes(1);
    });

    it('Should keep capturing global errors when the ExceptionsManager cannot be patched', () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        Object.freeze(manager);

        handler.captureManagedErrors(client);
        globalHandler(new Error('boom'), false);

        expect(manager.handleException).toBe(originalHandleException);
        expect(sendMock).toHaveBeenCalledTimes(1);
        expect(warn).toHaveBeenCalledWith(
            expect.stringContaining('Backtrace: failed to capture render errors outside an error boundary'),
        );
        warn.mockRestore();
    });
});
