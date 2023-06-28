import { BacktraceSessionProvider, IdGenerator } from '@backtrace/sdk-core';
import { TimeHelper } from '@backtrace/sdk-core/lib/common/TimeHelper';

export class BacktraceBrowserSessionProvider implements BacktraceSessionProvider {
    /**
     * Session persistence interval. If no event was send in the persistence interval
     * the session is treaten as an old session.
     */
    private readonly PERSISTENCE_INTERVAL = TimeHelper.convertSecondsToMilliseconds(30 * 60);
    private readonly SESSION_LAST_ACTIVE = 'backtrace-last-active';
    private readonly SESSION_GUID = 'backtrace-guid';

    /**
     * Session last active timestamp
     */
    get lastActive(): number {
        return this._lastActive;
    }
    /**
     * Determines if the current session is new.
     */
    public readonly newSession: boolean = true;
    /**
     * Current session Id
     */
    public readonly sessionId: string = IdGenerator.uuid();

    private _lastActive = 0;

    constructor() {
        if (!window.localStorage) {
            return;
        }

        const lastActive = this.readLastActiveTimestamp();
        if (!lastActive || TimeHelper.now() - lastActive > this.PERSISTENCE_INTERVAL) {
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

    private updateLastActiveTimestamp() {
        this._lastActive = TimeHelper.now();
        localStorage.setItem(this.SESSION_LAST_ACTIVE, this._lastActive.toString(10));
    }
}
