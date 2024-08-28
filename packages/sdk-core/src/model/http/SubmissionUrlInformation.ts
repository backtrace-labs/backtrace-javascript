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
     * Converts full submission JSON URL to PlCrashReporter submission URL
     * @param submissionUrl Backtrace Submission URL
     */
    public static toPlCrashReporterSubmissionUrl(submissionUrl: string): string {
        return this.changeSubmissionFormat(submissionUrl, 'plcrash');
    }

    /**
     * Converts full submission JSON URL to minidump submission URL
     * @param submissionUrl Backtrace Submission URL
     */
    public static toMinidumpSubmissionUrl(submissionUrl: string): string {
        return this.changeSubmissionFormat(submissionUrl, 'minidump');
    }

    public static toAttachmentSubmissionUrl(submissionUrl: string, rxid: string, attachmentName: string): string {
        const query = `object=${rxid}&attachment_name=${attachmentName}`;

        if (submissionUrl.includes('?')) {
            return (submissionUrl += `&` + query);
        }

        return (submissionUrl += '?' + query);
    }

    /**
     * Find the universe based on the submission URL
     * @param submissionUrl submission URL - full submission URL to Backtrace.
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
        const domainIndex = submissionUrl.indexOf('.backtrace.io');
        if (domainIndex === -1) {
            return undefined;
        }

        const protocolSeparator = '://';
        let protocolEndIndex = submissionUrl.indexOf(protocolSeparator);
        if (protocolEndIndex === -1) {
            protocolEndIndex = 0;
        } else {
            protocolEndIndex += protocolSeparator.length;
        }

        const hostname = submissionUrl.substring(protocolEndIndex, domainIndex);
        const endOfUniverseName = hostname.indexOf('.');
        return endOfUniverseName === -1 ? hostname : hostname.substring(0, endOfUniverseName);
    }

    public static findToken(submissionUrl: string): string | null {
        const submitIndex = submissionUrl.indexOf(this.SUBMIT_PREFIX);
        if (submitIndex !== -1) {
            const submissionUrlParts = submissionUrl.split('/');
            // submit format URL
            // submit.backtrace.io/universe/token/format
            // by spliting the submission URL by `/` and dropping the last
            // part of the URL, the last element on the list is the token.
            return submissionUrlParts[submissionUrlParts.length - 2] ?? null;
        }

        const url = new URL(submissionUrl);

        return url.searchParams.get('token');
    }

    public static changeSubmissionFormat(submissionUrl: string, desiredFormat: 'json' | 'plcrash' | 'minidump') {
        const submitIndex = submissionUrl.indexOf(this.SUBMIT_PREFIX);

        if (submitIndex !== -1) {
            const queryParametersIndex = submissionUrl.indexOf('?');
            const queryParameters = queryParametersIndex === -1 ? '' : submissionUrl.substring(queryParametersIndex);
            const pathname = submissionUrl.substring(
                submitIndex + this.SUBMIT_PREFIX.length,
                queryParametersIndex === -1 ? undefined : queryParametersIndex,
            );
            const pathParts = pathname.split('/');
            // path parts are prefixed with '/' character. Expected and valid submit format is:
            // /universe/token/format
            // splitting pathname should generate at least 4 elements ('', universe, token, format)
            // if pathParts length is not equal to 4 then the invalid were passed.
            const expectedMinimalPathParts = 3;
            if (pathParts.length < expectedMinimalPathParts) {
                return submissionUrl;
            }
            pathParts[2] = desiredFormat;
            return (
                submissionUrl.substring(0, submitIndex + this.SUBMIT_PREFIX.length) +
                pathParts.join('/') +
                queryParameters
            );
        } else {
            const url = new URL(submissionUrl);
            url.searchParams.set('format', desiredFormat);
            return url.href;
        }
    }
}
