import {
    BacktraceAttachment,
    BacktraceReportSubmissionResult,
    BacktraceRequestHandler,
    BacktraceSubmissionResponse,
    ConnectionError,
    DEFAULT_TIMEOUT,
} from '@backtrace/sdk-core';
import FormData from 'form-data';
import http from 'http';
import https from 'https';
import { Readable } from 'stream';
export class BacktraceNodeRequestHandler implements BacktraceRequestHandler {
    private readonly UPLOAD_FILE_NAME = 'upload_file';
    private readonly _timeout: number;

    private readonly JSON_HEADERS = {
        'Content-type': 'application/json',
        'Transfer-Encoding': 'chunked',
    };

    private readonly MULTIPART_HEADERS = {
        'Transfer-Encoding': 'chunked',
    };

    constructor(
        private readonly _options: {
            url: string;
            token?: string;
            timeout?: number;
            ignoreSslCertificate?: boolean;
        },
    ) {
        this._timeout = this._options.timeout ?? DEFAULT_TIMEOUT;
    }

    public async postError(
        submissionUrl: string,
        dataJson: string,
        attachments: BacktraceAttachment<Buffer | Readable | string | Uint8Array>[],
        abortSignal?: AbortSignal,
    ): Promise<BacktraceReportSubmissionResult<BacktraceSubmissionResponse>> {
        const formData = attachments.length === 0 ? dataJson : this.createFormData(dataJson, attachments);
        return this.send<BacktraceSubmissionResponse>(submissionUrl, formData, abortSignal);
    }

    public async post<T>(
        submissionUrl: string,
        payload: string,
        abortSignal?: AbortSignal,
    ): Promise<BacktraceReportSubmissionResult<T>> {
        return this.send<T>(submissionUrl, payload, abortSignal);
    }

    private async send<T>(
        submissionUrl: string,
        payload: string | FormData,
        abortSignal?: AbortSignal,
    ): Promise<BacktraceReportSubmissionResult<T>> {
        try {
            const url = new URL(submissionUrl);
            const httpClient = this.getHttpClient(url);

            return new Promise<BacktraceReportSubmissionResult<T>>((res) => {
                const request = httpClient.request(
                    url,
                    {
                        rejectUnauthorized: this._options.ignoreSslCertificate === true,
                        timeout: this._timeout,
                        method: 'POST',
                        headers:
                            typeof payload === 'string'
                                ? this.JSON_HEADERS
                                : { ...payload.getHeaders(), ...this.MULTIPART_HEADERS },
                    },
                    (response) => {
                        let result = '';
                        response.on('data', (d) => {
                            result += d.toString();
                        });
                        response.on('end', () => {
                            switch (response.statusCode) {
                                case 200: {
                                    res(BacktraceReportSubmissionResult.Ok(JSON.parse(result)));
                                    break;
                                }
                                case 401:
                                case 403: {
                                    res(BacktraceReportSubmissionResult.OnInvalidToken());
                                    break;
                                }
                                case 429: {
                                    res(BacktraceReportSubmissionResult.OnLimitReached());
                                    break;
                                }
                                default: {
                                    res(BacktraceReportSubmissionResult.OnInternalServerError(result));
                                    break;
                                }
                            }

                            cleanup();
                        });
                        response.on('error', () => {
                            cleanup();
                        });
                    },
                );

                function abortFn(this: AbortSignal) {
                    const reason =
                        this.reason instanceof Error
                            ? this.reason
                            : typeof this.reason === 'string'
                            ? new Error(this.reason)
                            : new Error('Operation cancelled.');

                    request.destroy(reason);
                }

                abortSignal?.addEventListener('abort', abortFn, { once: true });

                function cleanup() {
                    abortSignal?.removeEventListener('abort', cleanup);
                }

                request.on('error', (err: Error) => {
                    cleanup();
                    if (ConnectionError.isConnectionError(err)) {
                        return res(BacktraceReportSubmissionResult.OnNetworkingError(err.message));
                    }
                    return res(BacktraceReportSubmissionResult.OnInternalServerError(err.message));
                });

                if (typeof payload === 'string') {
                    request.write(payload);
                    request.end();
                } else {
                    payload.pipe(request);
                }
            });
        } catch (err) {
            if (ConnectionError.isConnectionError(err)) {
                return BacktraceReportSubmissionResult.OnNetworkingError(err.message);
            }

            const errorMessage = err instanceof Error ? err.message : (err as string);
            return BacktraceReportSubmissionResult.OnUnknownError(errorMessage);
        }
    }

    private getHttpClient(submissionUrl: URL) {
        return submissionUrl.protocol === 'https:' ? https : http;
    }
    private createFormData(json: string, attachments?: BacktraceAttachment<Buffer | Readable | string | Uint8Array>[]) {
        const formData = new FormData();
        formData.append(this.UPLOAD_FILE_NAME, json, `${this.UPLOAD_FILE_NAME}.json`);

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
