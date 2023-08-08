import { IdGenerator } from '../../common/IdGenerator';
import { BacktraceAttachment } from '../../model/attachment';
import {
    BacktraceDatabaseConfiguration,
    DeduplicationStrategy,
} from '../../model/configuration/BacktraceDatabaseConfiguration';
import { BacktraceData } from '../../model/data/BacktraceData';
import { BacktraceReportSubmission } from '../../model/http/BacktraceReportSubmission';
import { BacktraceDatabaseContext } from './BacktraceDatabaseContext';
import { BacktraceDatabaseStorageProvider } from './BacktraceDatabaseStorageProvider';
import { DeduplicationModel } from './DeduplicationModel';
import { BacktraceDatabaseRecord } from './model/BacktraceDatabaseRecord';
export class BacktraceDatabase {
    /**
     * Determines if the database is enabled.
     */
    public get enabled() {
        return this._enabled;
    }

    private readonly _databaseRecordContext: BacktraceDatabaseContext;
    private readonly _deduplicationModel: DeduplicationModel;

    private readonly _maximumRecords: number;
    private readonly _retryInterval: number;
    private _intervalId?: ReturnType<typeof setInterval>;

    private _enabled = false;

    constructor(
        private readonly _options: BacktraceDatabaseConfiguration | undefined,
        private readonly _storageProvider: BacktraceDatabaseStorageProvider,
        private readonly _requestHandler: BacktraceReportSubmission,
    ) {
        this._databaseRecordContext = new BacktraceDatabaseContext(this._options?.maximumRetries);
        this._deduplicationModel = new DeduplicationModel(
            this._options?.deduplicationStrategy ?? DeduplicationStrategy.None,
        );
        this._maximumRecords = this._options?.maximumNumberOfRecords ?? 8;
        this._retryInterval = this._options?.retryInterval ?? 60_000;
    }

    /**
     * Starts database integration.
     * @returns true if the database started successfully. Otherwise false.
     */
    public start(): boolean {
        if (this._enabled) {
            return this._enabled;
        }

        if (this._options?.enabled === false) {
            return false;
        }

        const startResult = this._storageProvider.start();
        if (!startResult) {
            return false;
        }

        this.loadReports().then(async () => {
            await this.setupDatabaseAutoSend();
        });
        this._enabled = true;
        return true;
    }

    /**
     * Adds backtrace data to the database
     * @param backtraceData diagnostic data object
     * @param attachments attachments
     * @returns record if database is enabled. Otherwise undefined.
     */
    public add(
        backtraceData: BacktraceData,
        attachments: BacktraceAttachment<unknown>[],
    ): BacktraceDatabaseRecord | undefined {
        if (!this._enabled) {
            return undefined;
        }

        const dataHash = this._deduplicationModel.getSha(backtraceData);
        if (dataHash) {
            const existingRecord = this._databaseRecordContext.find((record) => record.hash === dataHash);
            if (existingRecord) {
                existingRecord.count++;
                return existingRecord;
            }
        }

        this.prepareDatabase();

        const record = {
            count: 1,
            data: backtraceData,
            hash: dataHash,
            id: IdGenerator.uuid(),
            locked: false,
            attachments: attachments,
        };
        this._storageProvider.add(record);
        this._databaseRecordContext.add(record);

        return record;
    }

    /**
     * Returns stored references to Backtrace records
     * @returns available records in the database
     */
    public get(): BacktraceDatabaseRecord[] {
        return this._databaseRecordContext.get();
    }

    /**
     * @returns Returns number of records stored in the Database
     */
    public count(): number {
        return this._databaseRecordContext.count();
    }

    /**
     * Disables database integration. After running the dispose method, you cannot
     * execute any database operations.
     */
    public dispose() {
        this._enabled = false;
        clearInterval(this._intervalId);
    }

    /**
     * Removes the database record
     * @param record database records
     */
    public async remove(record: BacktraceDatabaseRecord) {
        if (!this._enabled) {
            return;
        }
        this._databaseRecordContext.remove(record);
        await this._storageProvider.delete(record);
    }

    /**
     * Prepare database to insert records
     * @param totalNumberOfRecords number of records to insert
     */
    private prepareDatabase(totalNumberOfRecords = 1) {
        const numberOfRecords = this.count();
        if (numberOfRecords + totalNumberOfRecords > this._maximumRecords) {
            this._databaseRecordContext.dropOverflow(totalNumberOfRecords);
        }
    }

    private async loadReports(): Promise<void> {
        const records = await this._storageProvider.get();
        if (records.length > this._maximumRecords) {
            records.length = this._maximumRecords;
        }
        this.prepareDatabase(records.length);
        this._databaseRecordContext.load(records);
    }

    private async setupDatabaseAutoSend() {
        if (this._options?.autoSend === false) {
            return;
        }

        const sendDatabaseReports = async () => {
            await this.sendRecords();
        };
        this._intervalId = setInterval(sendDatabaseReports, this._retryInterval);
        await this.sendRecords();
    }

    private async sendRecords() {
        let submissionFailure = false;
        for (let bucketIndex = 0; bucketIndex < this._databaseRecordContext.bucketCount; bucketIndex++) {
            if (submissionFailure) {
                break;
            }
            for (const record of this._databaseRecordContext.getBucket(bucketIndex)) {
                if (record.locked) {
                    continue;
                }
                try {
                    record.locked = true;
                    const result = await this._requestHandler.send(record.data, record.attachments);
                    if (result.status === 'Ok') {
                        this.remove(record);
                        continue;
                    }
                    submissionFailure = true;
                    this._databaseRecordContext.increaseBucket(bucketIndex);
                    break;
                } finally {
                    record.locked = false;
                }
            }
        }
    }
}
