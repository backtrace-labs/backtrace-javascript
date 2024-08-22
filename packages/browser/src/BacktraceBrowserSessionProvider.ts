import { BacktraceSessionProvider, IdGenerator, TimeHelper } from '@backtrace/sdk-core';

export class BacktraceBrowserSessionProvider implements BacktraceSessionProvider {
    /**
     * Session persistence interval. If no event was send in the persistence interval
     * the session is treaten as an old session.
     */
    public static readonly PERSISTENCE_INTERVAL = TimeHelper.convertSecondsToMilliseconds(30 * 60);
    private readonly SESSION_LAST_ACTIVE = 'backtrace-last-active';
    private readonly SESSION_GUID = 'backtrace-guid';

    get lastActive(): number {
        return this._lastActive;
    }

    public readonly newSession: boolean = true;

    public readonly sessionId: string = IdGenerator.uuid();

    private _lastActive = 0;

    constructor() {
        if (!window.localStorage) {
            return;
        }

        const lastActive = this.readLastActiveTimestamp();
        if (!lastActive || TimeHelper.now() - lastActive > BacktraceBrowserSessionProvider.PERSISTENCE_INTERVAL) {
            this.updateLastActiveTimestamp();
            localStorage.setItem(this.SESSION_GUID, this.sessionId);
            return;
        }
        this._lastActive = lastActive;
        this.newSession = false;
        this.sessionId = localStorage.getItem(this.SESSION_GUID) as string;
    }

    public afterMetricsSubmission(): void {
        this.updateLastActiveTimestamp();
    }

    public shouldSend(): boolean {
        // if the document is hidden, we shouldn't send metrics, because the open document
        // is the one who is being used by the user. This condition makes sure two or more web
        // browser tabs of the same app won't report the same metrics or false positive metrics.
        return document.hidden === false;
    }

    private readLastActiveTimestamp(): number | undefined {
        const lastActiveStringTimestamp = localStorage.getItem(this.SESSION_LAST_ACTIVE);
        if (!lastActiveStringTimestamp) {
            return undefined;
        }

        const lastActive = parseInt(lastActiveStringTimestamp, 10);
        if (isNaN(lastActive)) {
            return undefined;
        }

        return lastActive;
    }

    public updateLastActiveTimestamp() {
        this._lastActive = TimeHelper.now();
        localStorage.setItem(this.SESSION_LAST_ACTIVE, this._lastActive.toString(10));
    }
}
