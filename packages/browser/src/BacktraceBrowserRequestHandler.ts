import {
    anySignal,
    BacktraceAttachment,
    BacktraceReportSubmissionResult,
    BacktraceRequestHandler,
    ConnectionError,
    DEFAULT_TIMEOUT,
} from '@backtrace/sdk-core';

export interface BacktraceBrowserRequestHandlerOptions {
    readonly timeout?: number;
}

export class BacktraceBrowserRequestHandler implements BacktraceRequestHandler {
    private readonly UPLOAD_FILE_NAME = 'upload_file';
    private readonly _timeout: number;
    private readonly JSON_HEADERS = {
        'Content-type': 'application/json',
        'Transfer-Encoding': 'chunked',
    };

    private readonly MULTIPART_HEADERS = {
        'Transfer-Encoding': 'chunked',
    };
    constructor(options?: BacktraceBrowserRequestHandlerOptions) {
        this._timeout = options?.timeout ?? DEFAULT_TIMEOUT;
    }
    public async postError<T>(
        submissionUrl: string,
        dataJson: string,
        attachments: BacktraceAttachment<Blob | string>[],
        abortSignal?: AbortSignal,
    ): Promise<BacktraceReportSubmissionResult<T>> {
        const payload = attachments.length === 0 ? dataJson : this.createFormData(dataJson, attachments);
        return this.post(submissionUrl, payload, abortSignal);
    }

    public async post<T>(
        submissionUrl: string,
        payload: string | FormData,
        abortSignal?: AbortSignal,
    ): Promise<BacktraceReportSubmissionResult<T>> {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), this._timeout);
        const signal = anySignal(abortSignal, controller.signal);

        try {
            const response = await fetch(submissionUrl, {
                method: 'POST',
                body: payload,
                headers: typeof payload === 'string' ? this.JSON_HEADERS : this.MULTIPART_HEADERS,
                signal,
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
        } finally {
            // Check for backwards compatibility
            if ('dispose' in signal && typeof signal.dispose === 'function') {
                signal.dispose();
            }
        }
    }

    private createFormData(json: string, attachments: BacktraceAttachment<Blob | string>[]) {
        const formData = new FormData();
        formData.append(this.UPLOAD_FILE_NAME, json);

        if (!attachments || attachments.length === 0) {
            return formData;
        }
        for (const attachment of attachments) {
            const data = attachment.get();
            if (!data) {
                continue;
            }
            formData.append(`attachment_${attachment.name}`, data);
        }

        return formData;
    }
}
