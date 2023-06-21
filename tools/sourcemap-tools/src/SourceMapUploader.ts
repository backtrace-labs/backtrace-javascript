import crypto from 'crypto';
import fs from 'fs';
import http from 'http';
import { Readable } from 'stream';
import { SOURCEMAP_DEBUG_ID_KEY } from './DebugIdGenerator';

const DEBUG_ID_QUERY = 'symbolication_id';

interface Sourcemap {
    version: number;
    [SOURCEMAP_DEBUG_ID_KEY]?: string;
}

interface UploadResponse {
    response: 'ok' | string;
    _rxid: string;
}

export interface UploadResult {
    rxid: string;
    debugId: string;
}

export class SourceMapUploader {
    private readonly _url: URL;

    constructor(url: string | URL) {
        this._url = new URL(url);
    }

    public async upload(fileStream: Readable, debugId?: string): Promise<UploadResult>;
    public async upload(filePath: string, debugId?: string): Promise<UploadResult>;
    public async upload(pathOrStream: string | Readable, debugId?: string): Promise<UploadResult> {
        if (typeof pathOrStream === 'string') {
            pathOrStream = fs.createReadStream(pathOrStream);
        }

        const content = await this.readStreamToEnd(pathOrStream);
        const sourcemap = JSON.parse(content.toString('utf-8'));

        pathOrStream.destroy();

        return this.uploadSourcemap(sourcemap, debugId);
    }

    public async uploadContent(content: string, debugId?: string): Promise<UploadResult>;
    public async uploadContent(content: object, debugId?: string): Promise<UploadResult>;
    public uploadContent(content: string | object, debugId?: string): Promise<UploadResult> {
        if (typeof content === 'string') {
            content = JSON.parse(content) as object;
        }

        return this.uploadSourcemap(content, debugId);
    }

    private async uploadSourcemap(sourcemap: unknown, debugId?: string): Promise<UploadResult> {
        this.assertValidSourcemap(sourcemap);

        if (!debugId) {
            debugId = sourcemap[SOURCEMAP_DEBUG_ID_KEY];

            if (!debugId) {
                debugId = crypto.randomUUID();
                console.warn(`Sourcemap does not have a debug ID. Using ${debugId}`);
            }
        }

        const uploadUrl = this.buildUploadUrl(debugId);

        return new Promise<UploadResult>((resolve, reject) => {
            const request = http.request(
                {
                    hostname: uploadUrl.hostname,
                    port: uploadUrl.port,
                    protocol: uploadUrl.protocol,
                    path: uploadUrl.pathname + uploadUrl.search,
                    method: 'POST',
                },
                (response) => {
                    if (!response.statusCode) {
                        return reject(new Error('Failed to upload sourcemap: failed to make the request.'));
                    }

                    if (response.statusCode < 200 || response.statusCode >= 300) {
                        return reject(new Error(`Failed to upload sourcemap: ${response.statusCode}`));
                    }

                    const data: Buffer[] = [];
                    response.on('data', (chunk) => {
                        data.push(chunk);
                    });

                    response.on('end', () => {
                        const responseData = JSON.parse(Buffer.concat(data).toString('utf-8')) as UploadResponse;
                        if (responseData.response === 'ok') {
                            return resolve({
                                debugId: debugId as string,
                                rxid: responseData._rxid,
                            });
                        }
                    });
                },
            );

            request.on('error', reject);
            request.write(JSON.stringify(sourcemap));

            request.end();
        });
    }

    private assertValidSourcemap(value: unknown): asserts value is Sourcemap {
        if (typeof value !== 'object') {
            throw new Error('Sourcemap must be an object.');
        }

        if (!value) {
            throw new Error('Sourcemap must not be null.');
        }

        const sourcemap = value as Partial<Sourcemap>;
        if (sourcemap.version !== 3) {
            throw new Error('Sourcemap version is not supported.');
        }
    }

    private async readStreamToEnd(stream: Readable): Promise<Buffer> {
        return new Promise<Buffer>((resolve, reject) => {
            stream.on('error', reject);

            const chunks: Buffer[] = [];
            stream.on('data', (chunk) => chunks.push(chunk));
            stream.on('end', () => {
                resolve(Buffer.concat(chunks));
            });
        });
    }

    private buildUploadUrl(debugId: string) {
        const url = new URL(this._url);

        const existing = url.searchParams.get(DEBUG_ID_QUERY);
        if (!existing || existing === 'SYMBOLICATION_ID' || existing === 'DEBUG_ID') {
            url.searchParams.set(DEBUG_ID_QUERY, debugId);
        }

        return url;
    }
}
