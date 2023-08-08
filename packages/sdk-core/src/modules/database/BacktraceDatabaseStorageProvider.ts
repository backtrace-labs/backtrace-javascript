import { BacktraceDatabaseRecord } from './model/BacktraceDatabaseRecord';

export interface BacktraceDatabaseStorageProvider {
    add(databaseRecord: BacktraceDatabaseRecord): void;
    get(): Promise<BacktraceDatabaseRecord[]>;
    start(): boolean;
    delete(record: BacktraceDatabaseRecord): Promise<boolean>;
}
