import { IdGenerator } from '../../common/IdGenerator';
import { TimeHelper } from '../../common/TimeHelper';
import { BacktraceSessionProvider } from './BacktraceSessionProvider';

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
