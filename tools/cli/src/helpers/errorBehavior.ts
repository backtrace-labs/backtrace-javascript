import { Err, Ok, Result, ResultErr } from '@backtrace-labs/sourcemap-tools';

export const ErrorBehaviors = {
    exit: 'exit',
    error: 'error',
    warn: 'warn',
    info: 'info',
    debug: 'debug',
    trace: 'trace',
    skip: 'skip',
} as const;

export type ErrorBehavior = keyof typeof ErrorBehaviors;

export function GetErrorBehavior(type: string): Result<ErrorBehavior, string> {
    const valid = Object.keys(ErrorBehaviors);
    if (valid.includes(type)) {
        return Ok(type as ErrorBehavior);
    }

    return Err(`invalid error behavior "${type}", expected one of: ${valid.join(', ')}`);
}

export interface FailedElement<E> {
    readonly reason: Result<never, E>;
}

export function handleError(behavior: ErrorBehavior = 'exit') {
    return function _handleAssetErrors<T, E = string>(
        fn?: (err: E, behavior: Exclude<ErrorBehavior, 'skip' | 'exit'>) => void,
    ) {
        return function _handleAssetErrors(error: E): Result<T | FailedElement<E>, E> {
            switch (behavior) {
                case 'exit':
                    return Err(error);
                case 'skip':
                    return Ok<FailedElement<E>>({ reason: Err(error) });
                default:
                    fn && fn(error, behavior);
                    return Ok<FailedElement<E>>({ reason: Err(error) });
            }
        };
    };
}

export function filterFailedElements<T>(asset: Array<T | FailedElement<unknown>>): T[] {
    return asset.filter(
        (a) => !(typeof a === 'object' && !!a && 'reason' in a && a.reason instanceof ResultErr),
    ) as T[];
}
