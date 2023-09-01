import http from 'http';
import https from 'https';
import { Readable } from 'stream';
import { ResultPromise } from './models/AsyncResult';
import { Err, Ok, Result } from './models/Result';

interface CoronerUploadResponse {
    response: 'ok' | string;
    _rxid: string;
}

export interface UploadResult {
    rxid: string;
}

export interface SymbolUploaderOptions {
    ignoreSsl?: boolean;
    headers?: http.OutgoingHttpHeaders;
}

/**
 * Class responsible for uploading symbols to Backtrace.
 *
 * Expects symbol upload responses.
 */
export class SymbolUploader {
    private readonly _url: URL;

    constructor(url: string | URL, private readonly _options?: SymbolUploaderOptions) {
        this._url = new URL(url);
    }

    /**
     * Uploads the symbol to Backtrace.
     * @param content Symbol stream.
     */
    public async uploadSymbol(readable: Pick<Readable, 'pipe'>): ResultPromise<UploadResult, string> {
        const protocol = this._url.protocol === 'https:' ? https : http;

        return new Promise<Result<UploadResult, string>>((resolve, reject) => {
            const request = protocol.request(
                this._url,
                {
                    method: 'POST',
                    rejectUnauthorized: !this._options?.ignoreSsl,
                    headers: this._options?.headers,
                },
                (response) => {
                    if (!response.statusCode) {
                        return resolve(Err('Failed to upload symbol: failed to make the request.'));
                    }

                    const data: Buffer[] = [];
                    response.on('data', (chunk) => {
                        data.push(chunk);
                    });

                    response.on('error', reject);

                    response.on('end', () => {
                        const rawResponse = Buffer.concat(data).toString('utf-8');
                        if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
                            return resolve(
                                Err(`Failed to upload symbol: ${response.statusCode}. Response data: ${rawResponse}`),
                            );
                        }

                        try {
                            const responseData = JSON.parse(rawResponse) as CoronerUploadResponse;
                            if (responseData.response === 'ok') {
                                return resolve(
                                    Ok({
                                        rxid: responseData._rxid,
                                    }),
                                );
                            } else {
                                return resolve(Err(`Non-OK response received from Coroner: ${rawResponse}`));
                            }
                        } catch (err) {
                            return resolve(Err(`Cannot parse response from Coroner: ${rawResponse}`));
                        }
                    });
                },
            );

            request.on('error', reject);
            readable.pipe(request);
        });
    }
}
