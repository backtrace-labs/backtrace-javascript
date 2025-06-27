import { toArray } from '../../common/asyncGenerator.js';
import { BacktraceDatabaseConfiguration } from '../../model/configuration/BacktraceDatabaseConfiguration.js';
import { BacktraceIterableStorage, BacktraceStorage, BacktraceSyncStorage } from '../storage/BacktraceStorage.js';
import { BacktraceDatabaseRecordSerializers } from './BacktraceDatabaseRecordSerializer.js';
import { BacktraceDatabaseStorageProvider } from './BacktraceDatabaseStorageProvider.js';
import { BacktraceDatabaseRecord } from './model/BacktraceDatabaseRecord.js';

export class BacktraceDatabaseFileStorageProvider implements BacktraceDatabaseStorageProvider {
    private _enabled = true;

    private readonly RECORD_SUFFIX = '-record.json';
    private constructor(
        private readonly _serializers: BacktraceDatabaseRecordSerializers,
        private readonly _storage: BacktraceSyncStorage & BacktraceStorage & BacktraceIterableStorage,
    ) {}

    /**
     * Create a provider if provided options are valid
     * @param options database configuration
     * @returns database file storage provider
     */
    public static createIfValid(
        serializers: BacktraceDatabaseRecordSerializers,
        storage: BacktraceSyncStorage & BacktraceStorage & BacktraceIterableStorage,
        options?: BacktraceDatabaseConfiguration,
    ): BacktraceDatabaseFileStorageProvider | undefined {
        if (!options) {
            return undefined;
        }

        if (!options.enable) {
            return undefined;
        }

        return new BacktraceDatabaseFileStorageProvider(serializers, storage);
    }

    public start(): boolean {
        // make sure by mistake we don't create anything or start any operation
        if (this._enabled === false) {
            return false;
        }

        return true;
    }

    public delete(record: BacktraceDatabaseRecord): boolean {
        const recordPath = this.getRecordPath(record.id);
        return this.unlinkRecord(recordPath);
    }

    public add(record: BacktraceDatabaseRecord): boolean {
        const recordPath = this.getRecordPath(record.id);
        const serializer = this._serializers[record.type];
        if (!serializer) {
            return false;
        }

        try {
            const serialized = serializer.save(record);
            if (!serialized) {
                return false;
            }

            this._storage.setSync(recordPath, serialized);
            return true;
        } catch {
            return false;
        }
    }

    public async get(): Promise<BacktraceDatabaseRecord[]> {
        const databaseFiles = await toArray(this._storage.keys());

        const recordNames = databaseFiles.filter((file) => file.endsWith(this.RECORD_SUFFIX));

        const records: BacktraceDatabaseRecord[] = [];
        for (const recordName of recordNames) {
            try {
                const recordJson = await this._storage.get(recordName);
                if (!recordJson) {
                    await this._storage.remove(recordName);
                    continue;
                }

                let record: BacktraceDatabaseRecord | undefined;
                for (const serializer of Object.values(this._serializers)) {
                    record = serializer.load(recordJson);
                    if (record) {
                        break;
                    }
                }

                if (!record) {
                    await this._storage.remove(recordName);
                    continue;
                }

                records.push(record);
            } catch {
                await this._storage.remove(recordName);
            }
        }

        return records;
    }

    private unlinkRecord(recordPath: string): boolean {
        if (!this._storage.hasSync(recordPath)) {
            return false;
        }

        try {
            this._storage.removeSync(recordPath);
            return true;
        } catch {
            return false;
        }
    }

    private getRecordPath(id: string): string {
        return `${id}${this.RECORD_SUFFIX}`;
    }
}
