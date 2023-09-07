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

export function getErrorBehavior(type: string): Result<ErrorBehavior, string> {
    const valid = Object.keys(ErrorBehaviors);
    if (valid.includes(type)) {
        return Ok(type as ErrorBehavior);
    }

    return Err(`invalid error behavior "${type}", expected one of: ${valid.join(', ')}`);
}

export interface BehaviorSkippedElement<E> {
    readonly reason: Result<never, E>;
}

export function handleError(behavior: ErrorBehavior = 'exit') {
    return function _handleAssetErrors<T, E = string>(
        fn?: (err: E, behavior: Exclude<ErrorBehavior, 'skip' | 'exit'>) => void,
    ) {
        return function _handleAssetErrors(error: E): Result<T | BehaviorSkippedElement<E>, E> {
            switch (behavior) {
                case 'exit':
                    return Err(error);
                case 'skip':
                    return Ok<BehaviorSkippedElement<E>>({ reason: Err(error) });
                default:
                    fn && fn(error, behavior);
                    return Ok<BehaviorSkippedElement<E>>({ reason: Err(error) });
            }
        };
    };
}

export function filterBehaviorSkippedElements<T>(asset: Array<T | BehaviorSkippedElement<unknown>>): T[] {
    return asset.filter(
        (a) => !(typeof a === 'object' && !!a && 'reason' in a && a.reason instanceof ResultErr),
    ) as T[];
}
