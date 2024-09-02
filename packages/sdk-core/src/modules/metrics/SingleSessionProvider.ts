import { IdGenerator } from '../../common/IdGenerator.js';
import { TimeHelper } from '../../common/TimeHelper.js';
import { BacktraceSessionProvider } from './BacktraceSessionProvider.js';

export class SingleSessionProvider implements BacktraceSessionProvider {
    public readonly newSession: boolean = true;
    public readonly sessionId: string = IdGenerator.uuid();
    private _lastActive = 0;

    public get lastActive() {
        return this._lastActive;
    }

    public afterMetricsSubmission(): void {
        this._lastActive = TimeHelper.now();
    }
    /**
     * Allow to alway send metrics - in the single session there is no reason
     * to skip sending metrics.
     */
    public shouldSend(): boolean {
        return true;
    }
}
