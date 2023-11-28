import { jsonEscaper } from '@backtrace/sdk-core';
import type { Action, Middleware } from 'redux';
import { BacktraceClient } from '../BacktraceClient';

export interface BacktraceReduxMiddlewareOptions {
    /**
     * A function that can be used to skip an action or filter out information from a dispatched action, such as PII,
     * that shouldn't be sent to Backtrace. Return undefined to skip an action, otherwise whatever
     * (potentially modified) action returned will be sent to Backtrace.
     */
    readonly interceptAction?: (action: Action) => Action | undefined;

    /**
     * Middleware mode. Can be one of:
     * * `all` - include everything by default,
     * * `omit-values` - add the breadcrumb, but omit the values,
     * * `off` - disable the middleware.
     *
     * @default 'omit-values'
     */
    readonly mode?: 'all' | 'omit-values' | 'off';
}

function getBreadcrumbPayload(mode: Exclude<BacktraceReduxMiddlewareOptions['mode'], 'off'>, action: Action) {
    switch (mode) {
        case 'all':
            return { action: JSON.stringify(action, jsonEscaper()) };
        case 'omit-values':
            return undefined;
    }
}

/**
 *
 * @param client BacktraceClient used to send breadcrumbs
 * @param interceptAction A function that can be used to skip an action or filter out information from a dispatched action, such as PII,
 * that shouldn't be sent to Backtrace. Return undefined to skip an action, otherwise whatever
 * (potentially modified) action returned will be sent to Backtrace.
 */
export function createBacktraceReduxMiddleware(
    client: BacktraceClient,
    interceptAction?: (action: Action) => Action | undefined,
): Middleware;
/**
 *
 * @param client BacktraceClient used to send breadcrumbs
 * @param options Middleware options.
 */
export function createBacktraceReduxMiddleware(
    client: BacktraceClient,
    options?: BacktraceReduxMiddlewareOptions,
): Middleware;
/**
 *
 * @param client BacktraceClient used to send breadcrumbs
 * @param options Middleware options or intercept action function.
 */
export function createBacktraceReduxMiddleware(
    client: BacktraceClient,
    interceptActionOrOptions?: BacktraceReduxMiddlewareOptions | ((action: Action) => Action | undefined),
): Middleware;
export function createBacktraceReduxMiddleware(
    client: BacktraceClient,
    interceptActionOrOptions: BacktraceReduxMiddlewareOptions | ((action: Action) => Action | undefined) = (action) =>
        action,
): Middleware {
    if (!client) {
        throw new Error('Must pass a BacktraceClient to the BacktraceReduxMiddleware.');
    }

    const options: BacktraceReduxMiddlewareOptions =
        typeof interceptActionOrOptions === 'object'
            ? interceptActionOrOptions
            : {
                  interceptAction: interceptActionOrOptions,
              };

    const interceptAction = options.interceptAction ?? ((action) => action);
    const mode = options.mode ?? 'omit-values';

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const middleware: Middleware = () => (next) => (action: Action) => {
        try {
            const response = next(action);
            if (mode === 'off') {
                return response;
            }

            const interceptedAction = interceptAction(action);

            // If the user returns undefined for an action, we skip the breadcrumb
            if (!interceptedAction) {
                return response;
            }

            const payload = getBreadcrumbPayload(mode, interceptedAction);
            client.breadcrumbs?.info(`REDUX Action: ${interceptedAction.type}`, payload);

            return response;
        } catch (err) {
            const message = err instanceof Error ? err.message : err?.toString() ?? 'unknown';
            client.breadcrumbs?.warn(
                `A problem occurred during action ${action?.type ?? 'unknown'}. Reason: ${message}`,
            );
            throw err;
        }
    };

    return middleware;
}
