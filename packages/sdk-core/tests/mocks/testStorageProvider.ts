import crypto from 'crypto';
import { BacktraceData, BacktraceDatabaseSetup } from '../../src';

export const testDatabaseSetup: BacktraceDatabaseSetup = {
    hashProvider: {
        hash: (input: string) => crypto.createHash('sha256').update(input).digest('hex'),
    },
    storageProvider: {
        add: jest.fn().mockReturnValue({
            attachments: [],
            count: 1,
            data: {} as BacktraceData,
            hash: '',
            id: '123',
            locked: false,
        }),
        delete: jest.fn().mockResolvedValue(Promise.resolve(true)),
        start: jest.fn().mockReturnValue(true),
        get: jest.fn().mockResolvedValue(Promise.resolve([])),
    },
};
