// Required for polyfills to have the same name as the original implementations

function getGlobal<K extends keyof typeof window>(key: K): (typeof window)[K] | undefined {
    return typeof window !== 'undefined'
        ? window[key as keyof typeof window]
        : typeof global !== 'undefined'
        ? global[key as keyof typeof global]
        : typeof self !== 'undefined'
        ? self[key as keyof typeof self]
        : undefined;
}

export type OriginalAbortController = AbortController;
export type OriginalAbortSignal = AbortSignal;
export const OriginalAbortController = getGlobal('AbortController');
export const OriginalAbortSignal = getGlobal('AbortSignal');
