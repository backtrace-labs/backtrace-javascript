import { BacktraceDatabaseRecord } from './model/BacktraceDatabaseRecord.js';

export interface BacktraceDatabaseRecordSerializer<Record extends BacktraceDatabaseRecord = BacktraceDatabaseRecord> {
    readonly type: Record['type'];
    save(record: Record): string | undefined;
    load(serialized: string): Record | undefined;
}

export type BacktraceDatabaseRecordSerializers<Record extends BacktraceDatabaseRecord = BacktraceDatabaseRecord> = {
    [R in Record as Record['type']]: BacktraceDatabaseRecordSerializer<R>;
};
