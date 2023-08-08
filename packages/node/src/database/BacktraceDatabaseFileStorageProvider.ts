import {
    BacktraceDatabaseConfiguration,
    BacktraceDatabaseRecord,
    BacktraceDatabaseStorageProvider,
} from '@backtrace/sdk-core';
import fs from 'fs';
import * as fsPromise from 'fs/promises';
import path from 'path';
import { BacktraceDatabaseFileRecord } from './BacktraceDatabaseFileRecord';
export class BacktraceDatabaseFileStorageProvider implements BacktraceDatabaseStorageProvider {
    private _enabled = true;

    private readonly RECORD_SUFFIX = '-record.json';
    private constructor(private readonly _path: string, private readonly _createDatabaseDirectory: boolean = false) {}

    /**
     * Create a provider if provided options are valid
     * @param options database configuration
     * @returns database file storage provider
     */
    public static createIfValid(
        options?: BacktraceDatabaseConfiguration,
    ): BacktraceDatabaseFileStorageProvider | undefined {
        if (!options) {
            return undefined;
        }
        if (!options.enabled) {
            return undefined;
        }

        if (options.enabled && !options.path) {
            throw new Error(
                'Missing mandatory path to the database. Please define the database.path option in the configuration.',
            );
        }
        return new BacktraceDatabaseFileStorageProvider(options.path, options.createDatabaseDirectory);
    }

    public start(): boolean {
        // make sure by mistake we don't create anything or start any operation
        if (this._enabled === false) {
            return false;
        }

        const databaseDirectoryExists = fs.existsSync(this._path);
        if (this._createDatabaseDirectory === false) {
            return databaseDirectoryExists;
        }
        if (databaseDirectoryExists) {
            return true;
        }
        fs.mkdirSync(this._path, { recursive: true });
        return true;
    }

    public async delete(record: BacktraceDatabaseRecord): Promise<boolean> {
        const recordPath = this.getRecordPath(record.id);
        if (!fs.existsSync(recordPath)) {
            return false;
        }

        await fsPromise.unlink(recordPath);
        return true;
    }

    public add(record: BacktraceDatabaseRecord): void {
        const recordPath = this.getRecordPath(record.id);
        fs.writeFileSync(recordPath, JSON.stringify(BacktraceDatabaseFileRecord.fromRecord(record)), {
            encoding: 'utf8',
        });
    }

    public async get(): Promise<BacktraceDatabaseRecord[]> {
        const databaseFiles = await fsPromise.readdir(this._path, {
            encoding: 'utf8',
            withFileTypes: true,
        });

        const recordNames = databaseFiles
            .filter((file) => file.isFile() && file.name.endsWith(this.RECORD_SUFFIX))
            .map((n) => n.name);

        const records: BacktraceDatabaseRecord[] = [];
        for (const recordName of recordNames) {
            const recordPath = path.join(this._path, recordName);
            try {
                const recordJson = await fsPromise.readFile(recordPath, 'utf8');
                const record = BacktraceDatabaseFileRecord.fromJson(recordJson);
                if (!record) {
                    await fsPromise.unlink(recordPath);
                    continue;
                }
                records.push(record);
            } catch (err) {
                await fsPromise.unlink(recordPath);
            }
        }

        return records;
    }

    private getRecordPath(id: string): string {
        return path.join(this._path, `${id}${this.RECORD_SUFFIX}`);
    }
}
