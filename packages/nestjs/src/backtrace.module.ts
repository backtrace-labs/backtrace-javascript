import { BacktraceClient, BacktraceClientBuilder, type BacktraceConfiguration } from '@backtrace-labs/node';
import { ConfigurableModuleBuilder, Global, Module } from '@nestjs/common';

const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } = new ConfigurableModuleBuilder<
    BacktraceConfiguration | BacktraceClientBuilder
>()
    .setClassMethodName('forRoot')
    .build();

/**
 * Registers `BacktraceClient` and exports it.
 *
 * This module is global, you need to register it only once in your application.
 * The registered `BacktraceClient` will be used as a global instance.
 */
@Global()
@Module({
    providers: [
        {
            provide: BacktraceClient,
            useFactory: (optionsOrBuilder: typeof OPTIONS_TYPE) => {
                const instance =
                    optionsOrBuilder instanceof BacktraceClientBuilder
                        ? optionsOrBuilder.build()
                        : BacktraceClient.builder(optionsOrBuilder).build();

                BacktraceClient.use(instance);

                return instance;
            },
            inject: [MODULE_OPTIONS_TOKEN],
        },
    ],
    exports: [BacktraceClient],
})
export class BacktraceModule extends ConfigurableModuleClass {}
