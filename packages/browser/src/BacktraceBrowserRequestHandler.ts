import {
    BacktraceAttachment,
    BacktraceReportSubmissionResult,
    BacktraceRequestHandler,
    ConnectionError,
    DEFAULT_TIMEOUT,
} from '@backtrace/sdk-core';
import { BacktraceData } from '@backtrace/sdk-core/lib/model/data/BacktraceData';

export class BacktraceBrowserRequestHandler implements BacktraceRequestHandler {
    private readonly UPLOAD_FILE_NAME = 'upload_file';
    private readonly _timeout: number;
    private readonly JSON_HEADERS = {
        'Content-type': 'application/json',
    };

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
        attachments: BacktraceAttachment<Blob | string>[],
    ): Promise<BacktraceReportSubmissionResult<T>> {
        const formData = this.createFormData(JSON.stringify(data), attachments);
        return this.post(submissionUrl, formData);
    }

    public async post<T>(
        submissionUrl: string,
        payload: string | FormData,
    ): Promise<BacktraceReportSubmissionResult<T>> {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), this._timeout);

        try {
            const response = await fetch(submissionUrl, {
                method: 'POST',
                body: payload,
                headers: typeof payload === 'string' ? this.JSON_HEADERS : {},
                signal: controller.signal,
            });

            clearInterval(id);

            switch (response.status) {
                case 200: {
                    const result: T = await response.json();
                    return BacktraceReportSubmissionResult.Ok(result);
                }
                case 401:
                case 403: {
                    return BacktraceReportSubmissionResult.OnInvalidToken();
                }
                case 429: {
                    return BacktraceReportSubmissionResult.OnLimitReached();
                }
                default: {
                    return BacktraceReportSubmissionResult.OnInternalServerError(response.statusText);
                }
            }
        } catch (err) {
            if (!(err instanceof Error)) {
                return BacktraceReportSubmissionResult.OnUnknownError(err as string);
            }

            if (err.name === 'AbortError') {
                return BacktraceReportSubmissionResult.OnNetworkingError('Timeout');
            }
            if (ConnectionError.isConnectionError(err)) {
                return BacktraceReportSubmissionResult.OnNetworkingError(err.message);
            }

            return BacktraceReportSubmissionResult.OnUnknownError(err.message);
        }
    }

    private createFormData(json: string, attachments: BacktraceAttachment<Blob | string>[]) {
        const formData = new FormData();
        const blob = new Blob([json]);
        formData.append(this.UPLOAD_FILE_NAME, blob, `${this.UPLOAD_FILE_NAME}.json`);

        if (!attachments || attachments.length === 0) {
            return formData;
        }
        for (const attachment of attachments) {
            const data = attachment.get();
            if (!data) {
                continue;
            }
            formData.append(`attachment_${attachment.name}`, data, attachment.name);
        }

        return formData;
    }
}
