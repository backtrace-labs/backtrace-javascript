import { BacktraceDatabaseStorageProvider } from '../../src/index.js';
import { Mocked } from '../_mocks/types.js';

export function getTestStorageProvider(): Mocked<BacktraceDatabaseStorageProvider> {
    return {
        add: jest.fn().mockReturnValue(true),
        delete: jest.fn().mockReturnValue(true),
        start: jest.fn().mockReturnValue(true),
        get: jest.fn().mockResolvedValue(Promise.resolve([])),
    };
}
