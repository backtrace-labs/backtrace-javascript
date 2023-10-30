export interface BacktraceSubmissionResponse {
    response?: string;
    /**
     * Report ID
     */
    _rxid?: string;
    /**
     * Object Id - id of a submitted report.
     * Option available only in the synchronous upload.
     */
    object?: string;
    /**
     * Submitted report fingerprint.
     * Option available only in the synchronous upload.
     */
    fingerprint?: string;
}
