export class ConnectionError {
    /**
     * Verifies if an Error is a connection error
     * @param err error
     * @returns true if the error was caused by ETIMEDOUT or ECONNRESET or ECONNABORTED
     */
    public static isConnectionError(err: unknown): err is Error & { code: string } {
        const error = err as Error & { code: string };
        return error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET' || error.code === 'ECONNABORTED';
    }
}
