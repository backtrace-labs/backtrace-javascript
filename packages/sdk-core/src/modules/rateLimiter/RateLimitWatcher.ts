import { TimeHelper } from '../../common/TimeHelper';

export class RateLimitWatcher {
    /**
     * Time the single report can stay in the queue.
     */
    public readonly MAXIMUM_TIME_IN_QUEUE = 60;

    private readonly _reportPerMin: number;
    private readonly _watcherEnable: boolean;
    private _reportQueue: number[] = [];

    public get enabled(): boolean {
        return this._watcherEnable;
    }

    constructor(reportPerMin?: number) {
        if (reportPerMin == null) {
            reportPerMin = 0;
        }
        if (reportPerMin < 0) {
            throw new Error('ReportPerMinute argument must be greater or equal to zero');
        }
        this._reportPerMin = reportPerMin;
        this._watcherEnable = reportPerMin > 0;
    }

    public skipReport(): boolean {
        const time = TimeHelper.timeNowInSec();
        if (!this._watcherEnable) {
            return false;
        }
        this.clear(time);
        if (this._reportQueue.length >= this._reportPerMin) {
            return true;
        }
        this._reportQueue.push(time);
        return false;
    }

    private clear(time: number): void {
        if (this._reportQueue.length === 0) {
            return;
        }
        // we don't have anything to remove
        if (time - this._reportQueue[0] < this.MAXIMUM_TIME_IN_QUEUE) {
            return;
        }

        for (let queueIndex = this._reportQueue.length - 1; queueIndex != 0; queueIndex--) {
            if (time - this._reportQueue[queueIndex] >= this.MAXIMUM_TIME_IN_QUEUE) {
                this._reportQueue = this._reportQueue.slice(queueIndex);
                return;
            }
        }
    }
}
