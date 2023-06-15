import { BacktraceCoreClient, BacktraceRequestHandler } from '../../src';

export const TOKEN = '590d39eb154cff1d30f2b689f9a928bb592b25e7e7c10192fe208485ea68d91c';
export const UNIVERSE_NAME = 'test';
export const TEST_SUBMISSION_URL = `https://${UNIVERSE_NAME}.sp.backtrace.io:6098/post?format=json&token=${TOKEN}`;
export class BacktraceTestClient extends BacktraceCoreClient {
    public readonly requestHandler: BacktraceRequestHandler;
    constructor(handler: BacktraceRequestHandler) {
        super(
            {
                url: TEST_SUBMISSION_URL,
                token: TOKEN,
            },
            {
                agent: 'test',
                agentVersion: '0.0.1',
                langName: 'test',
                langVersion: 'test',
            },
            handler,
        );
        this.requestHandler = handler;
    }

    public static buildFakeClient() {
        return new BacktraceTestClient({
            post: jest.fn().mockResolvedValue(Promise.resolve()),
            postError: jest.fn().mockResolvedValue(Promise.resolve()),
        });
    }
}
