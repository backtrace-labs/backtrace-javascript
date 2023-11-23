import { BacktraceBreadcrumbs } from '@backtrace/sdk-core/src';
import { Action, configureStore, createSlice, Middleware, PayloadAction } from '@reduxjs/toolkit';
import { BacktraceClient } from '../../src/BacktraceClient';
import {
    BacktraceReduxMiddlewareOptions,
    createBacktraceReduxMiddleware,
} from '../../src/redux/BacktraceReduxMiddleware';

const clientBreadcrumbsEnabled = BacktraceClient.initialize({
    name: 'test-cleint',
    version: '1.2.3',
    url: 'https://test-bt-client-url.sp.backtrace.io',
    breadcrumbs: {
        enable: true,
    },
});

interface TestState {
    testArr: string[];
    testBool: boolean;
}

const initialState: TestState = {
    testArr: [],
    testBool: false,
};

const internalError = new Error('Test internal error');

const testSlice = createSlice({
    name: 'test',
    initialState,
    reducers: {
        addToTestArray(state, action: PayloadAction<string>) {
            state.testArr.push(action.payload);
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        toggleTestBool(state, action: PayloadAction<undefined>) {
            state.testBool = !state.testBool;
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        throwErrorForTest(state, action: PayloadAction<undefined>) {
            throw internalError;
        },
    },
});

const createLoggingMiddleware = (whatToLog: string) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const middleware: Middleware = (store) => (next) => (action) => {
        console.log(`${whatToLog} before`);
        const response = next(action);
        console.log(`${whatToLog} after`);
        return response;
    };
    return middleware;
};

const hiLoggingMiddleware = createLoggingMiddleware('hi');
const holaLoggingMiddleware = createLoggingMiddleware('hola');

const getExpectedBreadcrumb = (action: Action, mode?: BacktraceReduxMiddlewareOptions['mode']) => {
    switch (mode) {
        case 'all':
            return [`REDUX Action: ${action.type}`, { action: JSON.stringify(action) }];
        case undefined:
        case 'omit-values':
            return [`REDUX Action: ${action.type}`, undefined];
        default:
            return [];
    }
};

const { addToTestArray, toggleTestBool, throwErrorForTest } = testSlice.actions;

const getBreadcrumbsSpy = (method: 'info' | 'warn') => {
    return jest.spyOn(clientBreadcrumbsEnabled.breadcrumbs as BacktraceBreadcrumbs, method);
};

const getStore = (options?: BacktraceReduxMiddlewareOptions | ((action: Action) => Action | undefined)) =>
    configureStore({
        reducer: {
            test: testSlice.reducer,
        },
        middleware: (getDefaultMiddleware) => {
            const backtraceMiddleware = createBacktraceReduxMiddleware(clientBreadcrumbsEnabled, options);
            return getDefaultMiddleware().concat(backtraceMiddleware);
        },
    });

describe('createBacktraceReduxMiddleware', () => {
    it('Should throw an error if no client is passed in', () => {
        expect(() => createBacktraceReduxMiddleware(undefined as unknown as BacktraceClient)).toThrow();
    });

    describe('Redux store with Backtrace middleware and breadcrumbs enabled', () => {
        const store = getStore();

        afterEach(() => jest.restoreAllMocks());

        it('Should have defined breadcrumbs when enabled', () => {
            expect(clientBreadcrumbsEnabled.breadcrumbs).toBeDefined();
        });

        it('Should call client.breadcrumbs.info on action dispatch', () => {
            const breadcrumbsSpy = getBreadcrumbsSpy('info');
            store.dispatch(addToTestArray('test string'));
            store.dispatch(toggleTestBool());
            expect(breadcrumbsSpy).toHaveBeenCalledTimes(2);
        });

        it('Should call client.breadcrumbs.warn on an error during dispatch and rethrow the error', () => {
            const breadcrumbsSpy = getBreadcrumbsSpy('warn');
            try {
                store.dispatch(throwErrorForTest());
            } catch (e) {
                if (!(e instanceof Error)) {
                    throw new Error('e should be an error');
                }
                // the middleware should rethrow the caught error after saving a breadcrumb
                expect(e.message).toEqual(internalError.message);
            }
            expect(breadcrumbsSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('interceptAction', () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('Should run interceptAction when passed in options', () => {
            const fn = jest.fn(() => undefined);
            const store = getStore({ interceptAction: fn });
            store.dispatch(addToTestArray('test'));
            store.dispatch(toggleTestBool());
            expect(fn).toBeCalledTimes(2);
        });

        it('Should run interceptAction when passed as arg', () => {
            const fn = jest.fn(() => undefined);
            const store = getStore(fn);
            store.dispatch(addToTestArray('test'));
            store.dispatch(toggleTestBool());
            expect(fn).toBeCalledTimes(2);
        });

        it('Should not save a breadcrumb if undefined is returned by interceptAction', () => {
            const store = getStore({ interceptAction: () => undefined });
            const breadcrumbsSpy = getBreadcrumbsSpy('info');
            store.dispatch(addToTestArray('test'));
            store.dispatch(toggleTestBool());
            expect(breadcrumbsSpy).not.toHaveBeenCalled();
        });

        it('Should pass exact same action if no interceptAction method is provided', () => {
            const store = getStore();
            const breadcrumbsSpy = getBreadcrumbsSpy('info');
            const toggleAction = toggleTestBool();
            const expected = getExpectedBreadcrumb(toggleAction);
            store.dispatch(toggleAction);
            expect(breadcrumbsSpy).toBeCalledWith(...expected);
        });

        it('Should only save a breadcrumb for what is returned from interceptAction', () => {
            const interceptedAction = { type: 'expected-type' };
            const store = getStore({ interceptAction: () => interceptedAction });
            const breadcrumbsSpy = getBreadcrumbsSpy('info');
            const expected = getExpectedBreadcrumb(interceptedAction);
            store.dispatch(addToTestArray('Message to add'));
            expect(breadcrumbsSpy).toHaveBeenCalledWith(...expected);
        });

        it('Should have access to update the action via interceptAction', () => {
            const expectedType = 'redacted';
            const payload = 'expected-payload';
            const expectedAction = {
                type: expectedType,
                payload,
            };
            const store = getStore({
                interceptAction: (action: Action) => {
                    if (action.type === 'test/addToTestArray') {
                        return {
                            ...action,
                            type: expectedType,
                        };
                    } else {
                        throw new Error("action.type 'test/addToTestArray' never called");
                    }
                },
            });
            const breadcrumbsSpy = getBreadcrumbsSpy('info');
            const expected = getExpectedBreadcrumb(expectedAction);
            store.dispatch(addToTestArray(payload));
            expect(breadcrumbsSpy).toHaveBeenCalledWith(...expected);
        });

        describe('modes', () => {
            it('Should add only action type as JSON to breadcrumb attributes by default', () => {
                const interceptedAction = { type: 'expected-type', payload: { abc: '123' } };
                const store = getStore({ interceptAction: () => interceptedAction });
                const breadcrumbsSpy = getBreadcrumbsSpy('info');
                const expected = getExpectedBreadcrumb(interceptedAction, 'omit-values');
                store.dispatch(addToTestArray('Message to add'));
                expect(breadcrumbsSpy).toHaveBeenCalledWith(...expected);
            });

            it('Should add whole action as JSON to breadcrumb attributes when mode=all', () => {
                const interceptedAction = { type: 'expected-type', payload: { abc: '123' } };
                const store = getStore({ interceptAction: () => interceptedAction, mode: 'all' });
                const breadcrumbsSpy = getBreadcrumbsSpy('info');
                const expected = getExpectedBreadcrumb(interceptedAction, 'all');
                store.dispatch(addToTestArray('Message to add'));
                expect(breadcrumbsSpy).toHaveBeenCalledWith(...expected);
            });

            it('Should add only action type as JSON to breadcrumb attributes when mode=omit-values', () => {
                const interceptedAction = { type: 'expected-type', payload: { abc: '123' } };
                const store = getStore({ interceptAction: () => interceptedAction, mode: 'omit-values' });
                const breadcrumbsSpy = getBreadcrumbsSpy('info');
                const expected = getExpectedBreadcrumb(interceptedAction, 'omit-values');
                store.dispatch(addToTestArray('Message to add'));
                expect(breadcrumbsSpy).toHaveBeenCalledWith(...expected);
            });

            it('Should not add any breadcrumb when mode=off', () => {
                const interceptedAction = { type: 'expected-type', payload: { abc: '123' } };
                const store = getStore({ interceptAction: () => interceptedAction, mode: 'off' });
                const breadcrumbsSpy = getBreadcrumbsSpy('info');
                store.dispatch(addToTestArray('Message to add'));
                expect(breadcrumbsSpy).not.toBeCalled();
            });
        });
    });
});

describe('Multiple middleware interaction', () => {
    const backtraceMiddleware = createBacktraceReduxMiddleware(clientBreadcrumbsEnabled);
    const store = configureStore({
        reducer: {
            test: testSlice.reducer,
        },
        middleware: [hiLoggingMiddleware, backtraceMiddleware, holaLoggingMiddleware],
    });

    it('Should not interfere with other redux middlewares, both before and after', () => {
        const toggleAction = toggleTestBool();
        const breadcrumbsSpy = getBreadcrumbsSpy('info');
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        const expectedBreadcrumb = getExpectedBreadcrumb(toggleAction);
        const expectedConsoleLogs = ['hi before', 'hi after', 'hola before', 'hola after'];
        store.dispatch(toggleAction);
        expect(breadcrumbsSpy).toHaveBeenCalledWith(...expectedBreadcrumb);
        for (const expectedStr of expectedConsoleLogs) {
            expect(consoleSpy).toHaveBeenCalledWith(expectedStr);
        }
        jest.restoreAllMocks();
    });
});
