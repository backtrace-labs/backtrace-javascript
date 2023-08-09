import { BacktraceData, BacktraceDatabaseStorageProvider } from '../../src';

export const testStorageProvider: BacktraceDatabaseStorageProvider = {
    add: jest.fn().mockReturnValue({
        attachments: [],
        count: 1,
        data: {} as BacktraceData,
        hash: '',
        id: '123',
        locked: false,
    }),
    delete: jest.fn().mockReturnValue(true),
    start: jest.fn().mockReturnValue(true),
    get: jest.fn().mockResolvedValue(Promise.resolve([])),
};
