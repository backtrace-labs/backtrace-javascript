import { BacktraceDatabaseStorageProvider } from '../../src/index.js';

export const testStorageProvider: BacktraceDatabaseStorageProvider = {
    add: jest.fn().mockReturnValue(true),
    delete: jest.fn().mockReturnValue(true),
    start: jest.fn().mockReturnValue(true),
    get: jest.fn().mockResolvedValue(Promise.resolve([])),
};
