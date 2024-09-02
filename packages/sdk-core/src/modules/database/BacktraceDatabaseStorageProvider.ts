import { BacktraceDatabaseRecord } from './model/BacktraceDatabaseRecord.js';

export interface BacktraceDatabaseStorageProvider {
    add(databaseRecord: BacktraceDatabaseRecord): boolean;
    get(): Promise<BacktraceDatabaseRecord[]>;
    start(): boolean;
    delete(record: BacktraceDatabaseRecord): boolean;
}
