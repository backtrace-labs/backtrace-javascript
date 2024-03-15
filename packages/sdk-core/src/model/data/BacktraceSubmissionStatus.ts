export type BacktraceSubmissionStatus =
    /**
     * Set when client/server limit is reached
     */
    | 'Limit reached'
    /**
     * Set on successful data submission
     */
    | 'Ok'
    /**
     * Set on networking error (for example: connection reset)
     */
    | 'Network Error'
    /**
     * Set on internal server error
     */
    | 'Server Error'
    /**
     * Invalid submission token
     */
    | 'Invalid token'
    /**
     * Unknown error
     */
    | 'Unknown'
    /**
     * SDK is disabled
     */
    | 'Disabled SDK'
    /**
     * Due to before skip event or skipReport callback the user decided to skip the report
     */
    | 'Report skipped';
