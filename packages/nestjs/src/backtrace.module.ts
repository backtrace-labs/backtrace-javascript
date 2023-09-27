import { BacktraceClient, BacktraceClientBuilder, type BacktraceConfiguration } from '@backtrace-labs/node';
import { ConfigurableModuleBuilder, Global, Module } from '@nestjs/common';

const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } = new ConfigurableModuleBuilder<
    BacktraceConfiguration | BacktraceClientBuilder
>()
    .setClassMethodName('forRoot')
    .build();

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
