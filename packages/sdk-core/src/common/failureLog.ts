// Error messages can carry submission URLs, tokens or file paths.
export function failureType(error: unknown): string {
    if (error instanceof Error) {
        return error.name || 'Error';
    }
    return error == null ? 'unknown' : typeof error;
}

export function warnFailure(message: string, error?: unknown): void {
    console.warn(error === undefined ? `Backtrace: ${message}` : `Backtrace: ${message} (${failureType(error)})`);
}
