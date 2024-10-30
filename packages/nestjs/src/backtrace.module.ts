import { BacktraceClient } from '@backtrace/node';
import { ConfigurableModuleBuilder, Global, Module } from '@nestjs/common';
import { BacktraceExceptionFilter } from './backtrace.filter.js';
import { BacktraceExceptionHandler, BacktraceExceptionHandlerOptions } from './backtrace.handler.js';
import { BacktraceInterceptor } from './backtrace.interceptor.js';

export interface BacktraceModuleOptions {
    /**
     * Optional client instance to be used. If this is not provided, the global instance will be used.
     */
    readonly client?: BacktraceClient;

    /**
     * Backtrace exception handler options. Will be injected into the interceptor and filter, if not specified there.
     */
    readonly options?: BacktraceExceptionHandlerOptions;
}

const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } = new ConfigurableModuleBuilder<
    BacktraceModuleOptions | BacktraceClient | undefined
>().build();

/**
 * Registers `BacktraceClient` and exports it. If the client is not passed, the global one is used.
 * If using the global instance, make sure to call `BacktraceClient.initialize` first.
 *
 * This module is global, you need to register it only once in your application.
 */
@Global()
@Module({
    providers: [
        {
            provide: MODULE_OPTIONS_TOKEN,
            useFactory: () => BacktraceClient.instance,
        },
        {
            provide: BacktraceClient,
            useFactory: (instanceOrOptions?: BacktraceModuleOptions | BacktraceClient) => {
                const instance =
                    (instanceOrOptions instanceof BacktraceClient ? instanceOrOptions : instanceOrOptions?.client) ??
                    BacktraceClient.instance;

                const skipIfClientUndefined =
                    instanceOrOptions instanceof BacktraceClient
                        ? false
                        : instanceOrOptions?.options?.skipIfClientUndefined;

                if (!instance && !skipIfClientUndefined) {
                    throw new Error(
                        'Backtrace instance is not available. Initialize it first, or pass it into the module using register/registerAsync.',
                    );
                }

                return instance;
            },
            inject: [MODULE_OPTIONS_TOKEN],
        },
        {
            provide: BacktraceExceptionHandler,
            useFactory: (instanceOrOptions?: BacktraceModuleOptions | BacktraceClient) => {
                const options = instanceOrOptions instanceof BacktraceClient ? undefined : instanceOrOptions?.options;
                return new BacktraceExceptionHandler(options);
            },
            inject: [MODULE_OPTIONS_TOKEN],
        },
        BacktraceInterceptor,
        BacktraceExceptionFilter,
    ],
    exports: [BacktraceClient, BacktraceExceptionFilter, BacktraceExceptionHandler, BacktraceInterceptor],
})
export class BacktraceModule extends ConfigurableModuleClass {}
