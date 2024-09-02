import {
    BacktraceNodeClientSetup,
    BacktraceSetupConfiguration,
    BacktraceClient as NodeBacktraceClient,
} from '@backtrace/node';
import { BrowserWindow } from 'electron';
import { WindowAttributeProvider, WindowAttributeProviderOptions } from './attributes/WindowAttributeProvider.js';
import { BacktraceClientBuilder } from './builder/BacktraceClientBuilder.js';
import { BacktraceMainElectronModule } from './modules/BacktraceMainElectronModule.js';

export class BacktraceClient extends NodeBacktraceClient {
    constructor(clientSetup: BacktraceNodeClientSetup) {
        super({
            ...clientSetup,
            modules: [new BacktraceMainElectronModule()],
        });
    }

    public static builder(options: BacktraceSetupConfiguration): BacktraceClientBuilder {
        return new BacktraceClientBuilder({ options });
    }

    /**
     * Returns created BacktraceClient instance if the instance exists.
     * Otherwise undefined.
     */
    public static get instance(): BacktraceClient | undefined {
        return this._instance as BacktraceClient;
    }

    /**
     * Initializes the client. If the client already exists, the available instance
     * will be returned and all other options will be ignored.
     * @param options client configuration
     * @param build builder
     * @returns backtrace client
     */
    public static initialize(
        options: BacktraceSetupConfiguration,
        build?: (builder: BacktraceClientBuilder) => void,
    ): BacktraceClient {
        if (this.instance) {
            return this.instance;
        }
        const builder = this.builder(options);
        build && build(builder);
        this._instance = builder.build();
        return this._instance as BacktraceClient;
    }

    /**
     * Adds window information to reports as flattened attributes.
     * @param window Window to add attributes from.
     * @param options Options for the attribute provider.
     *
     * @example
     * // Will add attributes for window under `electron.window.${myWindow.id}`
     * client.addWindowAttributes(myWindow);
     *
     * // Will add attributes for window under `electron.window.myWindow`
     * client.addWindowAttributes(myWindow, { key: 'myWindow' })
     */
    public addWindow(window: BrowserWindow, options?: WindowAttributeProviderOptions): this {
        this.attributeManager.addProvider(new WindowAttributeProvider(window, options));
        return this;
    }

    /**
     * Adds main window information to reports. You should add only one window using this function.
     *
     * Same as `addWindow(window, { key: 'main' })`.
     * @param window Window to add attributes from.
     * @param options Options for the attribute provider.
     */
    public addMainWindow(window: BrowserWindow, options?: WindowAttributeProviderOptions): this {
        return this.addWindow(window, {
            key: 'main',
            ...options,
        });
    }
}
