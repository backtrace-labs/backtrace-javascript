import type { Middleware, Action } from 'redux';
import { BacktraceClient } from '../BacktraceClient';

/**
 *
 * @param client BacktraceClient used to send breadcrumbs
 * @param interceptAction A function that can be used to skip an action or filter out information from a dispatched action, such as PII, that shouldn't be sent to Backtrace. Return undefined to skip an action, otherwise whatever (potentially modified) action returned will be sent to Backtrace.
 */
export const createBacktraceReduxMiddleware = (
    client: BacktraceClient,
    interceptAction: (action: Action) => Action | undefined = (action) => action,
) => {
    if (!client) {
        throw new Error('Must pass a BacktraceClient to the BacktraceReduxMiddleware.');
    }
    const middleware: Middleware = (store) => (next) => (action: Action) => {
        try {
            const response = next(action);
            const interceptedAction = interceptAction(action);
            // If the user returns undefined for an action, we skip the breadcrumb
            if (interceptedAction) {
                client.breadcrumbs?.info(`REDUX Action: ${JSON.stringify(interceptedAction)}`);
            }
            return response;
        } catch (err) {
            const message = err instanceof Error ? err.message : err?.toString() ?? 'unknown';
            client.breadcrumbs?.warn(`A problem occurred during action ${action.type}. Reason: ${message}`);
            throw err;
        }
    };
    return middleware;
};
