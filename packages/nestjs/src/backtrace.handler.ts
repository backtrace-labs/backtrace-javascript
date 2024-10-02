import { BacktraceClient } from '@backtrace/node';
import { HttpException, Injectable, Optional } from '@nestjs/common';
import {
    ArgumentsHost,
    HttpArgumentsHost,
    RpcArgumentsHost,
    WsArgumentsHost,
} from '@nestjs/common/interfaces/index.js';
import { type Request as ExpressRequest } from 'express';

type ExceptionTypeFilter = (new (...args: never[]) => unknown)[] | ((err: unknown) => boolean);

export interface BacktraceExceptionHandlerOptions<Context extends ArgumentsHost = ArgumentsHost> {
    /**
     * If specified, only matching errors will be sent.
     *
     * Can be an array of error types, or a function returning `boolean`.
     * The error is passed to the function as first parameter.
     *
     * @example
     * // Include only InternalServerErrorException or errors deriving from it
     * {
     *   includeExceptionTypes: [InternalServerErrorException]
     * }
     *
     * // Include only errors that are instanceof InternalServerErrorException
     * {
     *   includeExceptionTypes: (error) => error instanceof InternalServerErrorException
     * }
     */
    readonly includeExceptionTypes?: ExceptionTypeFilter;

    /**
     * If specified, matching errors will not be sent.
     * Can be an array of error types, or a function returning `boolean`.
     * The error is passed to the function as first parameter.
     *
     * @example
     * // Exclude BadRequestException or errors deriving from it
     * {
     *   excludeExceptionTypes: [BadRequestException]
     * }
     *
     * // Exclude errors that are instanceof BadRequestException
     * {
     *   excludeExceptionTypes: (error) => error instanceof BadRequestException
     * }
     */
    readonly excludeExceptionTypes?: ExceptionTypeFilter;

    /**
     * Will not throw on initialization if `true` and the `BacktraceClient` instance is `undefined`.
     *
     * If this is `true` and the client instance is not available, the interceptor will not be run.
     *
     * @default false
     */
    readonly skipIfClientUndefined?: boolean;

    /**
     * This method will be called before sending the report.
     * Use this to build attributes that will be attached to the report.
     *
     * Note that this will overwrite the attributes. To add you own and keep the defaults, use `defaultAttributes`.
     * @param host Execution host.
     * @param defaultAttributes Attributes created by default by the interceptor.
     * @returns Attribute dictionary.
     *
     * @example
     * buildAttributes: (host, defaultAttributes) => ({
     *   ...defaultAttributes,
     *   'request.body': host.switchToHttp().getRequest().body
     * })
     */
    readonly buildAttributes?: (host: Context, defaultAttributes: Record<string, unknown>) => Record<string, unknown>;
}

@Injectable()
export class BacktraceExceptionHandler<Context extends ArgumentsHost = ArgumentsHost> {
    private readonly _client?: BacktraceClient;
    private readonly _options: BacktraceExceptionHandlerOptions;

    /**
     * Creates handler with the global client instance.
     *
     * The instance will be resolved while intercepting the request.
     * If the instance is not available, an error will be thrown.
     */
    constructor(options?: BacktraceExceptionHandlerOptions<Context>);
    /**
     * Creates handler with the provided client instance.
     */
    constructor(options: BacktraceExceptionHandlerOptions<Context> | undefined, client: BacktraceClient);
    constructor(options: BacktraceExceptionHandlerOptions | undefined, @Optional() client?: BacktraceClient) {
        this._options = {
            ...BacktraceExceptionHandler.getDefaultOptions(),
            ...options,
        };
        this._client = client;
    }

    public handleException(err: unknown, host: Context) {
        const client = this._client ?? BacktraceClient.instance;
        if (!client) {
            if (this._options.skipIfClientUndefined) {
                return false;
            }

            throw new Error('Backtrace instance is unavailable. Initialize the client first.');
        }

        if (!this.shouldSend(err)) {
            return false;
        }

        let attributes: Record<string, unknown> = {
            ...this.getBaseAttributes(host),
            ...this.getTypeAttributes(host),
        };

        if (this._options.buildAttributes) {
            attributes = this._options.buildAttributes(host, attributes);
        }

        if (typeof err !== 'string' && !(err instanceof Error)) {
            client.send(String(err), attributes);
        } else {
            client.send(err, attributes);
        }

        return true;
    }

    private shouldSend(error: unknown) {
        if (this._options.includeExceptionTypes && this.filterException(error, this._options.includeExceptionTypes)) {
            return true;
        }

        if (this._options.excludeExceptionTypes && this.filterException(error, this._options.excludeExceptionTypes)) {
            return false;
        }

        return true;
    }

    private getBaseAttributes(host: ArgumentsHost) {
        const contextType = host.getType();

        return {
            'request.contextType': contextType,
        };
    }

    private getTypeAttributes(host: ArgumentsHost) {
        const type = host.getType();
        switch (type) {
            case 'http':
                return this.getHttpAttributes(host.switchToHttp());
            case 'rpc':
                return this.getRpcAttributes(host.switchToRpc());
            case 'ws':
                return this.getWsAttributes(host.switchToWs());
            default:
                return {};
        }
    }

    private getHttpAttributes(http: HttpArgumentsHost) {
        const request = http.getRequest();
        const expressRequest = request as ExpressRequest;
        return {
            'request.url': expressRequest.url,
            'request.baseUrl': expressRequest.baseUrl,
            'request.method': expressRequest.method,
            'request.originalUrl': expressRequest.originalUrl,
            'request.protocol': expressRequest.protocol,
            'request.hostname': expressRequest.hostname,
            'request.httpVersion': expressRequest.httpVersion,
        };
    }

    private getRpcAttributes(rpc: RpcArgumentsHost) {
        return {
            ['rpc.data']: rpc.getData(),
        };
    }

    private getWsAttributes(ws: WsArgumentsHost) {
        return {
            ['ws.data']: ws.getData(),
        };
    }

    private filterException(exception: unknown, filter: ExceptionTypeFilter): boolean {
        if (Array.isArray(filter)) {
            return filter.some((f) => exception instanceof f);
        }

        return filter(exception);
    }

    private static getDefaultOptions<Context extends ArgumentsHost>(): BacktraceExceptionHandlerOptions<Context> {
        return {
            excludeExceptionTypes: (error) => error instanceof HttpException && error.getStatus() < 500,
            skipIfClientUndefined: false,
        };
    }
}
