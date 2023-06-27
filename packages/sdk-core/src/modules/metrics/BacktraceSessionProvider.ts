export interface BacktraceSessionProvider {
    /**
     * Determinates if the session just started
     */
    readonly newSession: boolean;

    /**
     * Current session id
     */
    readonly sessionId: string;

    /**
     * Returns last submission timestamp. If 0 it means metrics weren't send
     */
    get lastActive(): number;

    afterMetricsSubmission(): void;

    shouldSend(): boolean;
}
