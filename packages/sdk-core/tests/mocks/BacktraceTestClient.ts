import {
    BacktraceAttachment,
    BacktraceAttributeProvider,
    BacktraceConfiguration,
    BacktraceCoreClient,
    BacktraceDatabaseStorageProvider,
    BacktraceRequestHandler,
    BacktraceStorageModule,
} from '../../src/index.js';
import { testHttpClient } from '../mocks/testHttpClient.js';
export const TOKEN = '590d39eb154cff1d30f2b689f9a928bb592b25e7e7c10192fe208485ea68d91c';
export const UNIVERSE_NAME = 'test';
export const TEST_SUBMISSION_URL = `https://${UNIVERSE_NAME}.sp.backtrace.io:6098/post?format=json&token=${TOKEN}`;
export const APPLICATION = 'test-app';
export const APPLICATION_VERSION = '5.4.3';
export class BacktraceTestClient extends BacktraceCoreClient {
    public readonly requestHandler: BacktraceRequestHandler;
    public readonly storageProvider?: BacktraceDatabaseStorageProvider;
    constructor(
        options: Partial<BacktraceConfiguration>,
        handler: BacktraceRequestHandler,
        attributeProviders: BacktraceAttributeProvider[] = [],
        attachments: BacktraceAttachment[] = [],
        storage?: BacktraceStorageModule,
    ) {
        super({
            options: {
                url: TEST_SUBMISSION_URL,
                token: TOKEN,
                attachments,
                metrics: {
                    enable: false,
                },
                ...(options ?? {}),
            },
            sdkOptions: {
                agent: 'test',
                agentVersion: '0.0.1',
                langName: 'test',
                langVersion: 'test',
            },
            requestHandler: handler,
            attributeProviders,
            database: {
                storage,
            },
        });
        this.requestHandler = handler;
    }

    public static buildFakeClient(
        options: Partial<BacktraceConfiguration> = {},
        attributeProviders: BacktraceAttributeProvider[] = [],
        attachments: BacktraceAttachment[] = [],
        storage?: BacktraceStorageModule,
    ) {
        attributeProviders.push({
            type: 'scoped',
            get() {
                return {
                    application: APPLICATION,
                    ['application.version']: APPLICATION_VERSION,
                };
            },
        });
        const instance = new BacktraceTestClient(options, testHttpClient, attributeProviders, attachments, storage);
        instance.initialize();
        return instance;
    }
}
