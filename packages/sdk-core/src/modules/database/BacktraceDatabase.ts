import { anySignal, createAbortController } from '../../common/AbortController.js';
import { IdGenerator } from '../../common/IdGenerator.js';
import { unrefInterval } from '../../common/intervalHelper.js';
import { TimeHelper } from '../../common/TimeHelper.js';
import { BacktraceAttachment } from '../../model/attachment/index.js';
import { BacktraceDatabaseConfiguration } from '../../model/configuration/BacktraceDatabaseConfiguration.js';
import { BacktraceData } from '../../model/data/BacktraceData.js';
import { BacktraceReportSubmission } from '../../model/http/BacktraceReportSubmission.js';
import { BacktraceModule, BacktraceModuleBindData } from '../BacktraceModule.js';
import { SessionFiles } from '../storage/index.js';
import { BacktraceDatabaseContext } from './BacktraceDatabaseContext.js';
import { BacktraceDatabaseStorageProvider } from './BacktraceDatabaseStorageProvider.js';
import {
    AttachmentBacktraceDatabaseRecord,
    BacktraceDatabaseRecord,
    BacktraceDatabaseRecordCountByType,
    ReportBacktraceDatabaseRecord
} from './model/BacktraceDatabaseRecord.js';

export class BacktraceDatabase implements BacktraceModule {
    /**
     * Determines if the database is enabled.
     */
    public get enabled() {
        return this._enabled;
    }

    /**
     * Abort controller to cancel asynchronous database operations when
     * the database is being disabled by the user.
     */
    private readonly _abortController = createAbortController();

    private readonly _databaseRecordContext: BacktraceDatabaseContext;
    private readonly _storageProviders: BacktraceDatabaseStorageProvider[] = [];

    private readonly _recordLimits: BacktraceDatabaseRecordCountByType;
    private readonly _retryInterval: number;
    private _intervalId?: NodeJS.Timeout | number;;

    private _enabled = false;

    constructor(
        private readonly _options: BacktraceDatabaseConfiguration | undefined,
        private readonly _storageProvider: BacktraceDatabaseStorageProvider,
        private readonly _requestHandler: BacktraceReportSubmission,
        private readonly _sessionFiles?: SessionFiles,
    ) {
        this._databaseRecordContext = new BacktraceDatabaseContext(this._options?.maximumRetries);
        this._recordLimits = {
            report: this._options?.maximumNumberOfRecords ?? 8,
            attachment: this._options?.maximumNumberOfAttachmentRecords ?? 10,
        };
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

        const lockId = this._sessionFiles?.lockPreviousSessions();
        this.loadReports()
            .then(() => {
                this.setupDatabaseAutoSend();
            })
            .finally(() => lockId && this._sessionFiles?.unlockPreviousSessions(lockId));

        this._enabled = true;
        return true;
    }

    public bind({ reportEvents }: BacktraceModuleBindData): void {
        if (this._enabled) {
            return;
        }

        if (this._options?.enable === false) {
            return;
        }

        reportEvents.on('before-send', (_, data, attachments) => {
            const record = this.add(data, attachments);

            if (!record || record.locked) {
                return undefined;
            }

            record.locked = true;
        });

        reportEvents.on('after-send', (_, data, __, submissionResult) => {
            const record = this._databaseRecordContext.find(
                (record) => record.type === 'report' && record.data.uuid === data.uuid,
            );
            if (!record) {
                return;
            }
            record.locked = false;
            if (submissionResult.status === 'Ok') {
                this.remove(record);
                this._sessionFiles?.unlockPreviousSessions(record.id);
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
    ): ReportBacktraceDatabaseRecord | undefined {
        if (!this._enabled) {
            return undefined;
        }

        const sessionId = backtraceData.attributes?.['application.session'];

        const record: ReportBacktraceDatabaseRecord = {
            type: 'report',
            data: backtraceData,
            timestamp: TimeHelper.now(),
            id: IdGenerator.uuid(),
            locked: false,
            attachments: attachments,
            sessionId: typeof sessionId === 'string' ? sessionId : undefined,
        };

        this.prepareDatabase([record]);
        const saveResult = this._storageProvider.add(record);
        if (!saveResult) {
            return undefined;
        }

        this._databaseRecordContext.add(record);
        this.lockSessionWithRecord(record);

        return record;
    }

    /**
     * Adds Bactrace attachment to the database
     * @param backtraceData diagnostic data object
     * @param attachment the attachment to add
     * @param sessionId session ID to use
     * @returns record if database is enabled. Otherwise undefined.
     */
    public addAttachment(
        rxid: string,
        attachment: BacktraceAttachment,
        sessionId: string,
    ): AttachmentBacktraceDatabaseRecord | undefined {
        if (!this._enabled) {
            return undefined;
        }

        const record: AttachmentBacktraceDatabaseRecord = {
            type: 'attachment',
            timestamp: TimeHelper.now(),
            id: IdGenerator.uuid(),
            rxid,
            locked: false,
            attachment,
            sessionId,
        };

        this.prepareDatabase([record]);
        const saveResult = this._storageProvider.add(record);
        if (!saveResult) {
            return undefined;
        }

        this._databaseRecordContext.add(record);
        this.lockSessionWithRecord(record);

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
     * @returns Returns number of records by type stored in the Database
     */
    public countByType(): BacktraceDatabaseRecordCountByType {
        return this._databaseRecordContext.countByType();
    }

    /**
     * Disables database integration. After running the dispose method, you cannot
     * execute any database operations.
     */
    public dispose() {
        this._enabled = false;
        clearInterval(this._intervalId);
        this._abortController.abort();
    }

    /**
     * Removes the database record/records
     * @param recordOrRecords database records
     */
    public remove(recordOrRecords: BacktraceDatabaseRecord | BacktraceDatabaseRecord[]) {
        if (!this._enabled) {
            return;
        }
        const records = Array.isArray(recordOrRecords) ? recordOrRecords : [recordOrRecords];

        for (const record of records) {
            this._databaseRecordContext.remove(record);
            this._storageProvider.delete(record);
            this._sessionFiles?.unlockPreviousSessions(record.id);
        }
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
     * @param abortSignal optional abort signal to cancel sending requests
     */
    public async flush(abortSignal?: AbortSignal) {
        const start = TimeHelper.now();
        await this.send(abortSignal);
        const records = this.get().filter((n) => n.timestamp <= start);
        for (const record of records) {
            if (abortSignal?.aborted) {
                return;
            }
            this.remove(record);
        }
    }

    /**
     * Sends all records available in the database to Backtrace.
     * @param abortSignal optional abort signal to cancel sending requests
     */
    public async send(abortSignal?: AbortSignal) {
        for (let bucketIndex = 0; bucketIndex < this._databaseRecordContext.bucketCount; bucketIndex++) {
            // make a copy of records to not update the array after each remove
            const records = [...this._databaseRecordContext.getBucket(bucketIndex)];
            const signal = anySignal(abortSignal, this._abortController.signal);

            try {
                for (const record of records) {
                    if (!this.enabled) {
                        return;
                    }
                    if (record.locked) {
                        continue;
                    }
                    try {
                        record.locked = true;

                        const result =
                            record.type === 'report'
                                ? await this._requestHandler.send(record.data, record.attachments, signal)
                                : await this._requestHandler.sendAttachment(record.rxid, record.attachment, signal);

                        if (
                            result.status === 'Ok' ||
                            result.status === 'Unsupported' ||
                            result.status === 'Report skipped'
                        ) {
                            this.remove(record);
                            continue;
                        }
                        this._databaseRecordContext.increaseBucket(bucketIndex);
                        return;
                    } finally {
                        record.locked = false;
                    }
                }
            } finally {
                signal.dispose();
            }
        }
    }

    /**
     * Prepare database to insert records
     * @param forRecords records for which to update the database
     */
    private prepareDatabase(forRecords: BacktraceDatabaseRecord[]) {
        const dropLimits = { ...this._recordLimits };
        for (const record of forRecords) {
            dropLimits[record.type]--;
        }

        const dropped = this._databaseRecordContext.dropOverLimits(dropLimits);
        this.remove(dropped);
    }

    private async loadReports() {
        const records = await this._storageProvider.get();

        // limit only non-attachment records
        const countByType: BacktraceDatabaseRecordCountByType = {
            attachment: 0,
            report: 0,
        };

        const recordsToAdd: BacktraceDatabaseRecord[] = [];
        const recordsToRemove: BacktraceDatabaseRecord[] = [];
        for (const record of records) {
            if (countByType[record.type] >= this._recordLimits[record.type]) {
                recordsToRemove.push(record);
            } else {
                recordsToAdd.push(record);
                countByType[record.type]++;
            }
        }

        // delete old records before adding them to the database
        if (recordsToRemove.length) {
            this.remove(recordsToRemove);
        }

        this.prepareDatabase(recordsToAdd);
        this._databaseRecordContext.load(recordsToAdd);

        for (const record of recordsToAdd) {
            this.lockSessionWithRecord(record);
        }
    }

    private async setupDatabaseAutoSend() {
        if (this._options?.autoSend === false) {
            return;
        }

        const sendDatabaseReports = async () => {
            await this.send();
        };
        this._intervalId = setInterval(sendDatabaseReports, this._retryInterval);
        unrefInterval(this._intervalId);
        await this.send();
    }

    private lockSessionWithRecord(record: BacktraceDatabaseRecord) {
        if (!this._sessionFiles) {
            return;
        }

        const sessionId = record.sessionId;
        if (typeof sessionId !== 'string') {
            this._sessionFiles.lockPreviousSessions(record.id);
            return;
        }

        const session = this._sessionFiles.getSessionWithId(sessionId);
        session?.lock(record.id);
    }
}
