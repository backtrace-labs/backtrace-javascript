import { BacktraceDatabaseRecord } from './model/BacktraceDatabaseRecord';

export class BacktraceDatabaseContext {
    public readonly recordBucket: BacktraceDatabaseRecord[][];
    constructor(public readonly bucketCount: number = 3) {
        this.recordBucket = this.setupRecordBucket(this.bucketCount);
    }

    public find(predicate: (record: BacktraceDatabaseRecord) => boolean): BacktraceDatabaseRecord | undefined {
        for (let index = 0; index < this.bucketCount; index++) {
            for (const record of this.recordBucket[index]) {
                if (predicate(record)) {
                    return record;
                }
            }
        }
        return undefined;
    }

    public add(record: BacktraceDatabaseRecord): void {
        this.recordBucket[0].push(record);
    }

    public get(): BacktraceDatabaseRecord[] {
        const result = [];
        for (const bucket of this.recordBucket) {
            result.push(
                ...bucket.map((n) => {
                    return { ...n };
                }),
            );
        }

        return result;
    }

    public getBucket(index: number) {
        return this.recordBucket[index];
    }

    public count() {
        return Object.values(this.recordBucket)
            .map((n) => n.length)
            .reduce((total, current) => total + current, 0);
    }

    public remove(databaseRecord: BacktraceDatabaseRecord): void {
        for (let bucketIndex = 0; bucketIndex < this.bucketCount; bucketIndex++) {
            for (let recordIndex = 0; recordIndex < this.recordBucket[bucketIndex].length; recordIndex++) {
                const record = this.recordBucket[bucketIndex][recordIndex];
                if (databaseRecord.id === record.id) {
                    this.recordBucket[bucketIndex].splice(recordIndex, 1);
                    return;
                }
            }
        }
    }

    public increaseBucket(bucketStart: number) {
        for (let bucketIndex = this.bucketCount - 1; bucketIndex >= bucketStart; bucketIndex--) {
            if (bucketIndex === this.bucketCount - 1) {
                this.recordBucket[bucketIndex] = [];
                continue;
            }

            this.recordBucket[bucketIndex + 1] = this.recordBucket[bucketIndex];
            this.recordBucket[bucketIndex] = [];
        }
    }

    public load(records: BacktraceDatabaseRecord[]): void {
        this.recordBucket[0].push(...records);
    }

    public dropOverflow(overflow: number) {
        const result: BacktraceDatabaseRecord[] = [];
        for (let bucketIndex = this.bucketCount - 1; bucketIndex >= 0; bucketIndex--) {
            const bucket = this.recordBucket[bucketIndex];
            const removedRecords = bucket.splice(0, overflow);
            result.push(...removedRecords);

            if (result.length === overflow) {
                break;
            }
        }

        return result;
    }

    private setupRecordBucket(retries: number): BacktraceDatabaseRecord[][] {
        const result: BacktraceDatabaseRecord[][] = [];
        for (let index = 0; index < retries; index++) {
            result[index] = [];
        }

        return result;
    }
}
