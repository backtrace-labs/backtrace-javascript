export class SubmissionUrlInformation {
    private static SUBMIT_PREFIX = 'submit.backtrace.io/';

    /**
     * Convert url/token from credentials to JSON submission URL
     * @param url credentials URL
     * @param token credentials token
     * @returns JSON submissionURL
     */
    public static toJsonReportSubmissionUrl(url: string, token?: string): string {
        // if the token doesn't exist - use URL
        if (!token) {
            return url;
        }

        // if the url points to submit, we should always use it without any modifications
        if (url.includes(this.SUBMIT_PREFIX)) {
            return url;
        }

        // if the URL has token in the URL, the user probably added a token once again
        // in this case, don't do anything
        if (url.indexOf(token) !== -1) {
            return url;
        }

        const result = new URL(`/post`, url);
        result.searchParams.append('format', 'json');
        result.searchParams.append('token', token);
        return result.href;
    }

    /**
     * Find the universe based on the submission URL
     * @param submissionUrl submission URL
     * @returns universe name
     */
    public static findUniverse(submissionUrl: string): string | undefined {
        const submitIndex = submissionUrl.indexOf(this.SUBMIT_PREFIX);
        if (submitIndex !== -1) {
            // submit format URL
            // submit.backtrace.io/universe/token/format
            // we can expect the universe name just after the hostname
            const universeStartIndex = submitIndex + this.SUBMIT_PREFIX.length;
            const endOfUniverseName = submissionUrl.indexOf('/', universeStartIndex);
            return submissionUrl.substring(universeStartIndex, endOfUniverseName);
        }
        // the universe name should be available in the hostname
        // for example abc.sp.backtrace.io or zyx.in.backtrace.io or foo.backtrace.io
        const hostname = new URL(submissionUrl).hostname;
        if (!hostname.endsWith('backtrace.io')) {
            return undefined;
        }

        const endOfUniverseName = hostname.indexOf('.');
        return hostname.substring(0, endOfUniverseName);
    }

    public static findToken(submissionUrl: string): string | null {
        const submitIndex = submissionUrl.indexOf(this.SUBMIT_PREFIX);
        if (submitIndex !== -1) {
            const submissionUrlParts = submissionUrl.split('/');
            // submit format URL
            // submit.backtrace.io/universe/token/format
            // by spliting the submission URL by `/` and dropping the last
            // part of the URL, the last element on the list is the token.
            return submissionUrlParts[submissionUrlParts.length - 2];
        }

        const url = new URL(submissionUrl);

        return url.searchParams.get('token');
    }
}