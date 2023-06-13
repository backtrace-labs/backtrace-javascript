import {
    BacktraceAttachment,
    BacktraceReportSubmissionResult,
    BacktraceRequestHandler,
    BacktraceSubmissionResponse,
    DEFAULT_TIMEOUT,
} from '@backtrace/sdk-core';
import { BacktraceData } from '@backtrace/sdk-core/src/model/data/BacktraceData';
import FormData from 'form-data';
import fs from 'fs';
import http from 'http';
import https from 'https';

import path from 'path';

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
        attachments: BacktraceAttachment[],
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
                        rejectUnauthorized: this._options.ignoreSslCertificate === true,
                        timeout: this._timeout,
                        port: url.port ?? 443,
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
                                    res(BacktraceReportSubmissionResult.Ok(this.parseServerResponse(result)));
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
            const error = err as Error & { code: string };

            if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET' || error.code === 'ECONNABORTED') {
                return BacktraceReportSubmissionResult.OnNetworkingError(error.message);
            }

            const errorMessage = err instanceof Error ? err.message : (err as string);
            return BacktraceReportSubmissionResult.OnUnknownError(errorMessage);
        }
    }

    private getHttpClient(submissionUrl: URL) {
        return submissionUrl.protocol === 'http' ? http : https;
    }

    private parseServerResponse<T>(response: string): T {
        try {
            return JSON.parse(response);
        } catch {
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
            if (typeof attachment === 'string') {
                if (!fs.existsSync(attachment)) {
                    continue;
                }
                const name = path.basename(attachment);
                formData.append(`attachment_${name}`, fs.createReadStream(attachment), name);
                continue;
            }
            formData.append(`attachment_${attachment.name}`, attachment.data, attachment.name);
        }

        return formData;
    }
}
