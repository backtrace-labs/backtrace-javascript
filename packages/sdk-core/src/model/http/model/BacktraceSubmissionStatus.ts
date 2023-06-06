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
     * Set on networking error (for example: connection reset )
     */
    | 'Network Error'
    /**
     * Set on internal server error.
     */
    | 'Server Error'
    /**
     * Unknown error
     */
    | 'Unknown';
