import { BacktraceDatabaseHashProvider } from '@backtrace/sdk-core';
import crypto from 'crypto';

export class HashProvider implements BacktraceDatabaseHashProvider {
    public hash(input: string): string {
        return crypto.createHash('sha256').update(input).digest('hex');
    }
}
