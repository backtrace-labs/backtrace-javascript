import {
    BacktraceAttachment,
    BacktraceAttributeProvider,
    BacktraceConfiguration,
    BacktraceCoreClient,
    BacktraceDatabaseStorageProvider,
    BacktraceRequestHandler,
    FileSystem,
} from '../../src';
import { testHttpClient } from '../mocks/testHttpClient';
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
        fileSystem?: FileSystem,
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
            fileSystem,
        });
        this.requestHandler = handler;
    }

    public static buildFakeClient(
        options: Partial<BacktraceConfiguration> = {},
        attributeProviders: BacktraceAttributeProvider[] = [],
        attachments: BacktraceAttachment[] = [],
        fileSystem?: FileSystem,
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
        const instance = new BacktraceTestClient(options, testHttpClient, attributeProviders, attachments, fileSystem);
        instance.initialize();
        return instance;
    }
}
