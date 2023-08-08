import { BacktraceDatabaseStorageProvider } from '../../src';

export const testStorageProvider: BacktraceDatabaseStorageProvider = {
    add: jest.fn().mockReturnValue(undefined),
    delete: jest.fn().mockResolvedValue(Promise.resolve(true)),
    start: jest.fn().mockReturnValue(true),
    get: jest.fn().mockResolvedValue(Promise.resolve([])),
};
