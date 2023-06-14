import { TimeHelper } from '../../common/TimeHelper';
import { BacktraceReport } from '../report/BacktraceReport';

export class RateLimitWatcher {
    /**
     * Time the single report can stay in the queue.
     */
    public MAXIMUM_TIME_IN_QUEUE = 60;

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

    public skipReport(report: BacktraceReport): boolean {
        if (!this._watcherEnable) {
            return false;
        }
        this.clear();
        if (this._reportQueue.length >= this._reportPerMin) {
            return true;
        }
        this._reportQueue.push(report.timestamp);
        return false;
    }

    private clear(): void {
        const time = TimeHelper.now();
        if (this._reportQueue.length === 0) {
            return;
        }
        // we don't have anything to remove
        if (time - this._reportQueue[0] < this.MAXIMUM_TIME_IN_QUEUE) {
            return;
        }

        // the queue can be cleaned up
        if (time - this._reportQueue[this._reportQueue.length - 1] > this.MAXIMUM_TIME_IN_QUEUE) {
            // if the last report is longer than it should
            // we know we can clear the queue
            this._reportQueue.length = 0;
            return;
        }

        this._reportQueue = this._reportQueue.filter((n) => time - n < this.MAXIMUM_TIME_IN_QUEUE);
    }
}
