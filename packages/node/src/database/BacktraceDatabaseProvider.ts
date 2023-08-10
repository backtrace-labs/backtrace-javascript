import { BacktraceDatabaseConfiguration, BacktraceDatabaseSetup } from '@backtrace/sdk-core';
import { BacktraceDatabaseFileStorageProvider } from './BacktraceDatabaseFileStorageProvider';
import { HashProvider } from './HashProvider';

export class BacktraceDatabaseProvider {
    public static createIfValid(options?: BacktraceDatabaseConfiguration): BacktraceDatabaseSetup | undefined {
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

        return {
            hashProvider: new HashProvider(),
            storageProvider: new BacktraceDatabaseFileStorageProvider(options.path, options.createDatabaseDirectory),
        };
    }
}
