import { BacktraceConfiguration } from '../configuration/BacktraceConfiguration';
import { BacktraceData } from '../data/BacktraceData';
import { BacktraceAttachment } from '../report/BacktraceAttachment';
import { BacktraceRequestHandler } from './BacktraceRequestHandler';

export class BacktraceReportSubmission {
    private readonly _submissionUrl: string;
    constructor(options: BacktraceConfiguration, private readonly _requestHandler: BacktraceRequestHandler) {
        this._submissionUrl = this.generateReportSubmissionUrl(options.url, options.token);
    }

    public send(data: BacktraceData, attachments: BacktraceAttachment[]) {
        return this._requestHandler.postError(this._submissionUrl, data, attachments);
    }

    private generateReportSubmissionUrl(url: string, token?: string) {
        // if the token doesn't exist - use URL
        if (!token) {
            return url;
        }

        // if the URL has token in the URL, the user probably added a token once again
        // in this case, don't do anything
        if (url.indexOf(token) !== -1) {
            return url;
        }

        return new URL(`/post?format=json&token=${token}`, url).href;
    }
}
