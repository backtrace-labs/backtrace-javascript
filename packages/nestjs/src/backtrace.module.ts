import { BacktraceClient } from '@backtrace/node';
import { ConfigurableModuleBuilder, Global, Module } from '@nestjs/common';

const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE } = new ConfigurableModuleBuilder<
    BacktraceClient | undefined
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
            useFactory: (instance?: typeof OPTIONS_TYPE) => {
                if (!instance) {
                    throw new Error(
                        'Backtrace instance is not available. Initialize it first, or pass it into the module using register/registerAsync.',
                    );
                }

                return instance;
            },
            inject: [MODULE_OPTIONS_TOKEN],
        },
    ],
    exports: [BacktraceClient],
})
export class BacktraceModule extends ConfigurableModuleClass {}
