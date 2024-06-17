import { jsonEscaper } from '../../common/jsonEscaper';
import { BacktraceDatabaseConfiguration } from '../../model/configuration/BacktraceDatabaseConfiguration';
import { FileSystem } from '../storage';
import { BacktraceDatabaseFileRecord } from './BacktraceDatabaseFileRecord';
import { BacktraceDatabaseStorageProvider } from './BacktraceDatabaseStorageProvider';
import { BacktraceDatabaseRecord } from './model/BacktraceDatabaseRecord';

export class BacktraceDatabaseFileStorageProvider implements BacktraceDatabaseStorageProvider {
    private _enabled = true;

    private readonly RECORD_SUFFIX = '-record.json';
    private constructor(
        private readonly _fileSystem: FileSystem,
        private readonly _path: string,
    ) {}

    /**
     * Create a provider if provided options are valid
     * @param options database configuration
     * @returns database file storage provider
     */
    public static createIfValid(
        fileSystem: FileSystem,
        options?: BacktraceDatabaseConfiguration,
    ): BacktraceDatabaseFileStorageProvider | undefined {
        if (!options) {
            return undefined;
        }

        if (!options.enable) {
            return undefined;
        }

        if (options.enable && !options.path) {
            throw new Error(
                'Missing mandatory path to the database. Please define the database.path option in the configuration.',
            );
        }

        return new BacktraceDatabaseFileStorageProvider(fileSystem, options.path);
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
        try {
            this._fileSystem.writeFileSync(
                recordPath,
                JSON.stringify(BacktraceDatabaseFileRecord.fromRecord(record), jsonEscaper()),
            );
            return true;
        } catch {
            return false;
        }
    }

    public async get(): Promise<BacktraceDatabaseRecord[]> {
        const databaseFiles = await this._fileSystem.readDir(this._path);

        const recordNames = databaseFiles
            .filter((file) => file.endsWith(this.RECORD_SUFFIX))
            .map((f) => this._path + '/' + f);

        const records: BacktraceDatabaseRecord[] = [];
        for (const recordName of recordNames) {
            try {
                const recordJson = await this._fileSystem.readFile(recordName);
                const record = BacktraceDatabaseFileRecord.fromJson(recordJson, this._fileSystem);
                if (!record) {
                    await this._fileSystem.unlink(recordName);
                    continue;
                }
                records.push(record);
            } catch {
                await this._fileSystem.unlink(recordName);
            }
        }

        return records;
    }

    private unlinkRecord(recordPath: string): boolean {
        if (!this._fileSystem.existsSync(recordPath)) {
            return false;
        }

        try {
            this._fileSystem.unlinkSync(recordPath);
            return true;
        } catch {
            return false;
        }
    }

    private getRecordPath(id: string): string {
        return this._path + '/' + `${id}${this.RECORD_SUFFIX}`;
    }
}
