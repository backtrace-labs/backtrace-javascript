import { BacktraceCoreClient } from '../..';
import { IdGenerator } from '../../common/IdGenerator';
import { TimeHelper } from '../../common/TimeHelper';
import { BacktraceAttachment } from '../../model/attachment';
import { BacktraceDatabaseConfiguration } from '../../model/configuration/BacktraceDatabaseConfiguration';
import { BacktraceData } from '../../model/data/BacktraceData';
import { BacktraceReportSubmission } from '../../model/http/BacktraceReportSubmission';
import { BacktraceModule } from '../BacktraceModule';
import { BacktraceDatabaseContext } from './BacktraceDatabaseContext';
import { BacktraceDatabaseStorageProvider } from './BacktraceDatabaseStorageProvider';
import { BacktraceDatabaseRecord } from './model/BacktraceDatabaseRecord';

export class BacktraceDatabase implements BacktraceModule {
    /**
     * Determines if the database is enabled.
     */
    public get enabled() {
        return this._enabled;
    }

    private readonly _databaseRecordContext: BacktraceDatabaseContext;
    private readonly _storageProviders: BacktraceDatabaseStorageProvider[] = [];

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
        this._maximumRecords = this._options?.maximumNumberOfRecords ?? 8;
        this._retryInterval = this._options?.retryInterval ?? 60_000;
    }

    /**
     * Starts database integration.
     * @returns true if the database started successfully. Otherwise false.
     */
    public initialize(): boolean {
        if (this._enabled) {
            return this._enabled;
        }

        if (this._options?.enable === false) {
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

    public bind(client: BacktraceCoreClient): void {
        if (this._enabled) {
            return;
        }

        if (this._options?.enable === false) {
            return;
        }

        client.reportEvents.on('before-send', (_, data, attachments) => {
            const record = this.add(data, attachments);

            if (!record || record.locked || record.count !== 1) {
                return undefined;
            }

            record.locked = true;
        });

        client.reportEvents.on('after-send', (_, data, __, submissionResult) => {
            const record = this._databaseRecordContext.find((record) => record.data === data);
            if (!record) {
                return;
            }
            record.locked = false;
            if (submissionResult.status === 'Ok') {
                this.remove(record);
            }
        });
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

        const record: BacktraceDatabaseRecord = {
            count: 1,
            data: backtraceData,
            timestamp: TimeHelper.now(),
            hash: '',
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

    public addStorageProvider(storageProvider: BacktraceDatabaseStorageProvider) {
        if (this._enabled) {
            throw new Error('Cannot add storage provider after the database has been enabled.');
        }

        this._storageProviders.push(storageProvider);
    }

    /**
     * Sends all records available in the database to Backtrace and removes them
     * no matter if the submission process was successful or not.
     */
    public async flush() {
        const start = TimeHelper.now();
        await this.send();
        const records = this.get().filter((n) => n.timestamp <= start);
        for (const record of records) {
            this.remove(record);
        }
    }
    /**
     * Sends all records available in the database to Backtrace.
     */
    public async send() {
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
            await this.send();
        };
        this._intervalId = setInterval(sendDatabaseReports, this._retryInterval);
        await this.send();
    }
}
