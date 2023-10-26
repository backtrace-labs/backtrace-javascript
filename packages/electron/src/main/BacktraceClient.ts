import {
    BacktraceNodeClientSetup,
    BacktraceSetupConfiguration,
    BacktraceClient as NodeBacktraceClient,
} from '@backtrace/node';
import { BrowserWindow } from 'electron';
import { WindowAttributeProvider, WindowAttributeProviderOptions } from './attributes/WindowAttributeProvider';
import { BacktraceClientBuilder } from './builder/BacktraceClientBuilder';
import { BacktraceMainElectronModule } from './modules/BacktraceMainElectronModule';

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
     * Adds window information to reports.
     *
     * By default, the window attributes will be added as an annotations.
     * To add them as attributes, set `key` or `attributes` to `true` in `options`.
     * @param window Window to add attributes from.
     * @param options Options for the attribute provider.
     *
     * @example
     * // Will add annotations for window under `electron.window.${myWindow.id}`
     * client.addWindowAttributes(myWindow);
     *
     * // Will add attributes and annotations for window under `electron.window.myWindow`
     * client.addWindowAttributes(myWindow, { key: 'myWindow' })
     *
     * // Will add annotations for window under `electron.window.myWindow`
     * client.addWindowAttributes(myWindow, { key: 'myWindow', attributes: false })
     */
    public addWindow(window: BrowserWindow, options?: WindowAttributeProviderOptions): this {
        this.attributeManager.addProvider(new WindowAttributeProvider(window, options));
        return this;
    }

    /**
     * Adds main window information to reports. You should add only one window by this.
     *
     * Same as `addWindow(window, { key: 'main' })`.
     * @param window Window to add attributes from.
     */
    public addMainWindow(window: BrowserWindow, options?: WindowAttributeProviderOptions): this {
        return this.addWindow(window, {
            key: 'main',
            ...options,
        });
    }
}
