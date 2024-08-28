import { BacktraceDatabaseRecord, BacktraceDatabaseRecordCountByType } from './model/BacktraceDatabaseRecord';

export class BacktraceDatabaseContext {
    private readonly _records: BacktraceDatabaseRecord[];
    private readonly _recordBuckets: Record<string, number> = {};

    constructor(public readonly bucketCount: number = 3) {
        this._records = [];
        this._recordBuckets = {};
    }

    public find(predicate: (record: BacktraceDatabaseRecord) => boolean): BacktraceDatabaseRecord | undefined {
        return this._records.find(predicate);
    }

    public add(record: BacktraceDatabaseRecord): void {
        if (this._recordBuckets[record.id] !== undefined) {
            this._recordBuckets[record.id] = 0;
            return;
        }

        this._records.push(record);
        this._recordBuckets[record.id] = 0;
    }

    public get(): BacktraceDatabaseRecord[] {
        return this._records.map((r) => ({ ...r }));
    }

    public getBucket(index: number) {
        const bucket: BacktraceDatabaseRecord[] = [];
        for (const record of this._records) {
            if (this._recordBuckets[record.id] === index) {
                bucket.push(record);
            }
        }

        return bucket;
    }

    public count() {
        return this._records.length;
    }

    public countByType() {
        return this._records.reduce((total, current) => {
            total[current.type]++;
            return total;
        }, {} as BacktraceDatabaseRecordCountByType);
    }

    public remove(databaseRecord: BacktraceDatabaseRecord): void;
    public remove(databaseRecordId: string): void;
    public remove(recordOrId: BacktraceDatabaseRecord | string): void {
        const id = typeof recordOrId === 'string' ? recordOrId : recordOrId.id;
        const index = this._records.findIndex((r) => r.id === id);
        if (index === -1) {
            return;
        }

        this._records.splice(index, 1);
        delete this._recordBuckets[id];
    }

    public increaseBucket(bucketStart: number) {
        for (const [id, bucket] of Object.entries(this._recordBuckets)) {
            if (bucket < bucketStart) {
                continue;
            }

            const newBucket = bucket + 1;
            if (newBucket >= this.bucketCount) {
                this.remove(id);
            }

            this._recordBuckets[id] = newBucket;
        }
    }

    public load(records: BacktraceDatabaseRecord[]): void {
        for (const record of records) {
            this.add(record);
        }
    }

    public dropOverLimits(limits: BacktraceDatabaseRecordCountByType) {
        const remaining = { ...limits };

        const dropped: BacktraceDatabaseRecord[] = [];

        for (let i = this._records.length - 1; i >= 0; i--) {
            const record = this._records[i];
            if (remaining[record.type] === 0) {
                this.remove(record);
                dropped.push(record);
            } else {
                remaining[record.type]--;
            }
        }

        return dropped;
    }
}
