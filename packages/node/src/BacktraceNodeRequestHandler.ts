import {
    BacktraceAttachment,
    BacktraceReportSubmissionResult,
    BacktraceRequestHandler,
    BacktraceSubmissionResponse,
    DEFAULT_TIMEOUT,
} from '@backtrace/sdk-core';
import { BacktraceData } from '@backtrace/sdk-core/src/model/data/BacktraceData';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import https from 'https';
import path from 'path';

export class BacktraceNodeRequestHandler implements BacktraceRequestHandler {
    private readonly UPLOAD_FILE_NAME = 'upload_file';
    private readonly _timeout: number;

    private readonly _httpAgent: https.Agent;
    constructor(
        private readonly _options: {
            url: string;
            token?: string;
            timeout?: number;
            ignoreSslCertificate?: boolean;
        },
    ) {
        this._timeout = this._options.timeout ?? DEFAULT_TIMEOUT;
        this._httpAgent = this._options.ignoreSslCertificate
            ? new https.Agent({ rejectUnauthorized: false })
            : https.globalAgent;
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
            const headers = {
                'Content-Type':
                    typeof payload === 'string'
                        ? 'application/json'
                        : `multipart/form-data; boundary=${payload.getBoundary()}`,
            };
            const result = await axios.post<T>(submissionUrl, payload, {
                timeout: this._timeout,
                httpsAgent: this._httpAgent,
                headers,
            });
            return BacktraceReportSubmissionResult.Ok(result.data);
        } catch (err) {
            if (axios.isAxiosError(err) && err.response) {
                if (err.response.status === 429) {
                    return BacktraceReportSubmissionResult.OnLimitReached();
                }
                if (err.response.status >= 500) {
                    return BacktraceReportSubmissionResult.OnInternalServerError(err.message);
                }
            }
            const error = err as Error & { code: string };

            if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET' || error.code === 'ECONNABORTED') {
                return BacktraceReportSubmissionResult.OnNetworkingError(error.message);
            }

            const errorMessage = err instanceof Error ? err.message : (err as string);
            return BacktraceReportSubmissionResult.OnUnknownError(errorMessage);
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
