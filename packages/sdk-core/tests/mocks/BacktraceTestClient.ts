import {
    BacktraceAttachment,
    BacktraceAttributeProvider,
    BacktraceCoreClient,
    BacktraceReportSubmissionResult,
    BacktraceRequestHandler,
} from '../../src';
export const TOKEN = '590d39eb154cff1d30f2b689f9a928bb592b25e7e7c10192fe208485ea68d91c';
export const UNIVERSE_NAME = 'test';
export const TEST_SUBMISSION_URL = `https://${UNIVERSE_NAME}.sp.backtrace.io:6098/post?format=json&token=${TOKEN}`;
export const APPLICATION = 'test-app';
export const APPLICATION_VERSION = '5.4.3';
export class BacktraceTestClient extends BacktraceCoreClient {
    public readonly requestHandler: BacktraceRequestHandler;
    constructor(
        handler: BacktraceRequestHandler,
        attributeProviders: BacktraceAttributeProvider[] = [],
        attachments: BacktraceAttachment[] = [],
    ) {
        super(
            {
                url: TEST_SUBMISSION_URL,
                token: TOKEN,
                attachments,
                metrics: {
                    enable: false,
                },
            },
            {
                agent: 'test',
                agentVersion: '0.0.1',
                langName: 'test',
                langVersion: 'test',
            },
            handler,
            attributeProviders,
        );
        this.requestHandler = handler;
    }

    public static buildFakeClient(
        attributeProviders: BacktraceAttributeProvider[] = [],
        attachments: BacktraceAttachment[] = [],
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
        return new BacktraceTestClient(
            {
                post: jest.fn().mockResolvedValue(Promise.resolve(BacktraceReportSubmissionResult.Ok('Ok'))),
                postError: jest.fn().mockResolvedValue(Promise.resolve()),
            },
            attributeProviders,
            attachments,
        );
    }
}
