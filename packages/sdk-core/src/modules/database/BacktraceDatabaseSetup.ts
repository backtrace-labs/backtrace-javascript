import { BacktraceDatabaseHashProvider } from './BacktraceDatabaseHashProvider';
import { BacktraceDatabaseStorageProvider } from './BacktraceDatabaseStorageProvider';

export interface BacktraceDatabaseSetup {
    storageProvider: BacktraceDatabaseStorageProvider;
    hashProvider: BacktraceDatabaseHashProvider;
}
