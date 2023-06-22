import {
    BacktraceAttachment,
    BacktraceReportSubmissionResult,
    BacktraceRequestHandler,
    BacktraceSubmissionResponse,
    ConnectionError,
    DEFAULT_TIMEOUT,
} from '@backtrace/sdk-core';
import { BacktraceData } from '@backtrace/sdk-core/lib/model/data/BacktraceData';
import FormData from 'form-data';
import http from 'http';
import https from 'https';
import { Readable } from 'stream';
export class BacktraceNodeRequestHandler implements BacktraceRequestHandler {
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
            ignoreSslCertificate?: boolean;
        },
    ) {
        this._timeout = this._options.timeout ?? DEFAULT_TIMEOUT;
    }

    public async postError(
        submissionUrl: string,
        data: BacktraceData,
        attachments: BacktraceAttachment<Buffer | Readable | string | Uint8Array>[],
    ): Promise<BacktraceReportSubmissionResult<BacktraceSubmissionResponse>> {
        const formData = this.createFormData(JSON.stringify(data), attachments);
        return this.send<BacktraceSubmissionResponse>(submissionUrl, formData);
    }

    public async post<T>(submissionUrl: string, payload: string): Promise<BacktraceReportSubmissionResult<T>> {
        return this.send<T>(submissionUrl, payload);
    }

    private async send<T>(
        submissionUrl: string,
        payload: string | FormData,
    ): Promise<BacktraceReportSubmissionResult<T>> {
        try {
            const url = new URL(submissionUrl);
            const httpClient = this.getHttpClient(url);

            return new Promise<BacktraceReportSubmissionResult<T>>((res) => {
                const request = httpClient.request(
                    {
                        hostname: url.hostname,
                        path: url.pathname,
                        port: url.port ?? 443,
                        rejectUnauthorized: this._options.ignoreSslCertificate === true,
                        timeout: this._timeout,
                        method: 'POST',
                        headers: typeof payload === 'string' ? this.JSON_HEADERS : payload.getHeaders(),
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
                        });
                    },
                );

                request.on('error', (err: Error) => {
                    if (ConnectionError.isConnectionError(err)) {
                        return res(BacktraceReportSubmissionResult.OnNetworkingError(err.message));
                    }
                    return res(BacktraceReportSubmissionResult.OnInternalServerError(err.message));
                });

                if (typeof payload === 'string') {
                    request.write(payload);
                } else {
                    payload.pipe(request);
                }

                request.end();
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
        return submissionUrl.protocol === 'http' ? http : https;
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
