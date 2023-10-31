// Required for polyfills to have the same name as the original implementations

export type OriginalAbortController = AbortController;
export type OriginalAbortSignal = AbortSignal;
export const OriginalAbortController = global.AbortController;
export const OriginalAbortSignal = global.AbortSignal;
