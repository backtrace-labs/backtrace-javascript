import {
    BacktraceAttachment,
    BacktraceReportSubmissionResult,
    BacktraceRequestHandler,
    DEFAULT_TIMEOUT,
} from '@backtrace/sdk-core';
import { BacktraceData } from '@backtrace/sdk-core/src/model/data/BacktraceData';

export class BacktraceBrowserRequestHandler implements BacktraceRequestHandler {
    private readonly UPLOAD_FILE_NAME = 'upload_file';
    private readonly _timeout: number;

    constructor(
        private readonly _options: {
            url: string;
            token?: string;
            timeout?: number;
        },
    ) {
        this._timeout = this._options.timeout ?? DEFAULT_TIMEOUT;
    }
    public async postError<T>(
        submissionUrl: string,
        data: BacktraceData,
        attachments: BacktraceAttachment[],
    ): Promise<BacktraceReportSubmissionResult<T>> {
        const formData = this.createFormData(JSON.stringify(data), attachments);
        return this.post(submissionUrl, formData);
    }

    public async post<T>(
        submissionUrl: string,
        payload: string | FormData,
    ): Promise<BacktraceReportSubmissionResult<T>> {
        const xmlHttpRequest = new XMLHttpRequest();
        xmlHttpRequest.timeout = this._timeout;
        xmlHttpRequest.open('POST', submissionUrl, true);

        xmlHttpRequest.send(payload);
        return new Promise<BacktraceReportSubmissionResult<T>>((res) => {
            xmlHttpRequest.onload = () => {
                if (xmlHttpRequest.readyState !== XMLHttpRequest.DONE) {
                    return;
                }
                switch (xmlHttpRequest.status) {
                    case 200: {
                        return res(
                            BacktraceReportSubmissionResult.Ok<T>(this.parseResponse<T>(xmlHttpRequest.responseText)),
                        );
                    }
                    case 429: {
                        return res(BacktraceReportSubmissionResult.OnLimitReached());
                    }
                    default: {
                        if (xmlHttpRequest.status >= 500) {
                            return res(
                                BacktraceReportSubmissionResult.OnInternalServerError(xmlHttpRequest.responseText),
                            );
                        }
                        return res(BacktraceReportSubmissionResult.OnNetworkingError(xmlHttpRequest.responseText));
                    }
                }
            };
        });
    }
    private parseResponse<T>(response: string): T {
        try {
            return JSON.parse(response);
        } catch (err) {
            return {} as T;
        }
    }

    private createFormData(json: string, attachments?: BacktraceAttachment[]) {
        const formData = new FormData();
        const blob = new Blob([json]);
        formData.append(this.UPLOAD_FILE_NAME, blob, `${this.UPLOAD_FILE_NAME}.json`);

        if (!attachments || attachments.length === 0) {
            return formData;
        }
        for (const attachment of attachments) {
            // no support for file paths
            if (typeof attachment === 'string') {
                continue;
            }
            formData.append(`attachment_${attachment.name}`, attachment.data.toString(), attachment.name);
        }

        return formData;
    }
}
