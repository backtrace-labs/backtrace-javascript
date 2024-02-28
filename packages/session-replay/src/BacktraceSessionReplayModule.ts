import { BacktraceModule, BacktraceModuleBindData } from '@backtrace/sdk-core';
import { BacktraceSessionRecorder, BacktraceSessionRecorderOptions } from './BacktraceSessionRecorder';

export class BacktraceSessionReplayModule implements BacktraceModule {
    private readonly _recorder: BacktraceSessionRecorder;

    constructor(options: BacktraceSessionRecorderOptions) {
        this._recorder = new BacktraceSessionRecorder(options);
    }

    public bind({ client }: BacktraceModuleBindData): void {
        client.addAttachment(this._recorder);
    }

    public initialize(): void {
        this._recorder.start();
    }

    public dispose(): void {
        this._recorder.stop();
    }
}
