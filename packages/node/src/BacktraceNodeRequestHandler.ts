import {
    BacktraceAttachment,
    BacktraceAttachmentResponse,
    BacktraceReportSubmissionResult,
    BacktraceRequestHandler,
    BacktraceSubmissionResponse,
    ConnectionError,
    DEFAULT_TIMEOUT,
} from '@backtrace/sdk-core';
import FormData from 'form-data';
import http, { ClientRequest, IncomingMessage } from 'http';
import https from 'https';
import { Readable } from 'stream';

export interface BacktraceNodeRequestHandlerOptions {
    readonly timeout?: number;
    readonly ignoreSslCertificate?: boolean;
}

export class BacktraceNodeRequestHandler implements BacktraceRequestHandler {
    private readonly UPLOAD_FILE_NAME = 'upload_file';
    private readonly _timeout: number;
    private readonly _ignoreSslCertificate?: boolean;

    private readonly JSON_HEADERS = {
        'Content-type': 'application/json',
        'Transfer-Encoding': 'chunked',
    };

    private readonly MULTIPART_HEADERS = {
        'Transfer-Encoding': 'chunked',
    };

    constructor(options?: BacktraceNodeRequestHandlerOptions) {
        this._timeout = options?.timeout ?? DEFAULT_TIMEOUT;
        this._ignoreSslCertificate = options?.ignoreSslCertificate;
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

    public async postAttachment(
        submissionUrl: string,
        attachment: BacktraceAttachment<Buffer | Readable | string | Uint8Array>,
        abortSignal?: AbortSignal,
    ): Promise<BacktraceReportSubmissionResult<BacktraceAttachmentResponse>> {
        try {
            const attachmentData = attachment.get();
            if (!attachmentData) {
                return BacktraceReportSubmissionResult.ReportSkipped();
            }

            const url = new URL(submissionUrl);
            const httpClient = this.getHttpClient(url);

            return new Promise<BacktraceReportSubmissionResult<BacktraceAttachmentResponse>>((res) => {
                const request = httpClient.request(
                    url,
                    {
                        rejectUnauthorized: this._ignoreSslCertificate === true,
                        timeout: this._timeout,
                        method: 'POST',
                    },
                    (response) => {
                        let result = '';
                        response.on('data', (d) => {
                            result += d.toString();
                        });
                        response.on('end', () => {
                            cleanup();
                            return res(this.handleResponse(response, result));
                        });
                        response.on('error', () => {
                            cleanup();
                        });
                    },
                );

                abortSignal?.addEventListener(
                    'abort',
                    () => BacktraceNodeRequestHandler.abortFn(abortSignal, request),
                    { once: true },
                );

                function cleanup() {
                    abortSignal?.removeEventListener('abort', cleanup);
                }

                request.on('error', (err: Error) => {
                    cleanup();
                    return res(this.handleRequestError(err));
                });

                if (attachmentData instanceof Readable) {
                    attachmentData.pipe(request);
                } else {
                    request.write(attachmentData);
                }
            });
        } catch (err) {
            return this.handleError(err);
        }
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
                        rejectUnauthorized: this._ignoreSslCertificate === true,
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
                            cleanup();
                            return res(this.handleResponse(response, result));
                        });
                        response.on('error', () => {
                            cleanup();
                        });
                    },
                );

                abortSignal?.addEventListener(
                    'abort',
                    () => BacktraceNodeRequestHandler.abortFn(abortSignal, request),
                    { once: true },
                );

                function cleanup() {
                    abortSignal?.removeEventListener('abort', cleanup);
                }

                request.on('error', (err: Error) => {
                    cleanup();
                    return res(this.handleRequestError(err));
                });

                if (typeof payload === 'string') {
                    request.write(payload);
                    request.end();
                } else {
                    payload.pipe(request);
                }
            });
        } catch (err) {
            return this.handleError(err);
        }
    }

    private getHttpClient(submissionUrl: URL) {
        return submissionUrl.protocol === 'https:' ? https : http;
    }

    private handleResponse<T>(response: IncomingMessage, result: string) {
        switch (response.statusCode) {
            case 200: {
                return BacktraceReportSubmissionResult.Ok<T>(JSON.parse(result));
            }
            case 401:
            case 403: {
                return BacktraceReportSubmissionResult.OnInvalidToken<T>();
            }
            case 429: {
                return BacktraceReportSubmissionResult.OnLimitReached<T>();
            }
            default: {
                return BacktraceReportSubmissionResult.OnInternalServerError<T>(result);
            }
        }
    }

    private handleRequestError<T>(err: Error) {
        if (ConnectionError.isConnectionError(err)) {
            return BacktraceReportSubmissionResult.OnNetworkingError<T>(err.message);
        }
        return BacktraceReportSubmissionResult.OnInternalServerError<T>(err.message);
    }

    private handleError<T>(err: unknown) {
        if (ConnectionError.isConnectionError(err)) {
            return BacktraceReportSubmissionResult.OnNetworkingError<T>(err.message);
        }

        const errorMessage = err instanceof Error ? err.message : (err as string);
        return BacktraceReportSubmissionResult.OnUnknownError<T>(errorMessage);
    }

    private static abortFn(signal: AbortSignal, request: ClientRequest) {
        const reason =
            signal.reason instanceof Error
                ? signal.reason
                : typeof signal.reason === 'string'
                  ? new Error(signal.reason)
                  : new Error('Operation cancelled.');

        request.destroy(reason);
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
