import { IdGenerator } from '../../common/IdGenerator';
import { BacktraceAttachment } from '../../model/attachment';
import {
    BacktraceDatabaseConfiguration,
    DeduplicationStrategy,
} from '../../model/configuration/BacktraceDatabaseConfiguration';
import { BacktraceData } from '../../model/data/BacktraceData';
import { BacktraceReportSubmission } from '../../model/http/BacktraceReportSubmission';
import { BacktraceDatabaseContext } from './BacktraceDatabaseContext';
import { BacktraceDatabaseSetup } from './BacktraceDatabaseSetup';
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
    private readonly _storageProvider: BacktraceDatabaseStorageProvider;
    private readonly _deduplicationModel: DeduplicationModel;

    private readonly _maximumRecords: number;
    private readonly _retryInterval: number;
    private _intervalId?: ReturnType<typeof setInterval>;
    private _enabled = false;

    constructor(
        private readonly _options: BacktraceDatabaseConfiguration | undefined,
        databaseSetup: BacktraceDatabaseSetup,
        private readonly _requestHandler: BacktraceReportSubmission,
    ) {
        this._storageProvider = databaseSetup.storageProvider;
        this._deduplicationModel = new DeduplicationModel(
            databaseSetup.hashProvider,
            this._options?.deduplicationStrategy ?? DeduplicationStrategy.None,
        );
        this._databaseRecordContext = new BacktraceDatabaseContext(this._options?.maximumRetries);
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

        this.prepareDatabase();

        const dataHash = this._deduplicationModel.getSha(backtraceData);
        if (dataHash) {
            const existingRecord = this._databaseRecordContext.find((record) => record.hash === dataHash);
            if (existingRecord) {
                existingRecord.count++;
                return existingRecord;
            }
        }

        const record = {
            count: 1,
            data: backtraceData,
            hash: dataHash,
            id: IdGenerator.uuid(),
            locked: false,
            attachments: attachments,
        };

        const saveResult = this._storageProvider.add(record);
        if (!saveResult) {
            return undefined;
        }

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
    public remove(record: BacktraceDatabaseRecord) {
        if (!this._enabled) {
            return;
        }
        this._databaseRecordContext.remove(record);
        this._storageProvider.delete(record);
    }

    /**
     * Prepare database to insert records
     * @param totalNumberOfRecords number of records to insert
     */
    private prepareDatabase(totalNumberOfRecords = 1) {
        const numberOfRecords = this.count();
        if (numberOfRecords + totalNumberOfRecords <= this._maximumRecords) {
            return;
        }
        const recordsToDelete = this._databaseRecordContext.dropOverflow(totalNumberOfRecords);
        for (const record of recordsToDelete) {
            this._storageProvider.delete(record);
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
        for (let bucketIndex = 0; bucketIndex < this._databaseRecordContext.bucketCount; bucketIndex++) {
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
                    this._databaseRecordContext.increaseBucket(bucketIndex);
                    return;
                } finally {
                    record.locked = false;
                }
            }
        }
    }
}
