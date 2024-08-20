import { FileSystem } from '../storage';
import { AttachmentBacktraceDatabaseFileRecord } from './AttachmentBacktraceDatabaseFileRecord';
import { BacktraceDatabaseRecord } from './model/BacktraceDatabaseRecord';
import { ReportBacktraceDatabaseFileRecord } from './ReportBacktraceDatabaseFileRecord';

export const BacktraceDatabaseFileRecord = {
    fromRecord(record: BacktraceDatabaseRecord) {
        switch (record.type) {
            case 'attachment':
                return AttachmentBacktraceDatabaseFileRecord.fromRecord(record);
            case 'report':
                return ReportBacktraceDatabaseFileRecord.fromRecord(record);
            default:
                throw new Error('unknown record type');
        }
    },

    fromJson(json: string, fileSystem: FileSystem): BacktraceDatabaseFileRecord | undefined {
        try {
            const record = JSON.parse(json) as BacktraceDatabaseRecord;
            switch (record.type) {
                case 'attachment':
                    return AttachmentBacktraceDatabaseFileRecord.fromJson(record, fileSystem);
                case 'report':
                    return ReportBacktraceDatabaseFileRecord.fromJson(record, fileSystem);
                default:
                    return undefined;
            }
        } catch {
            return undefined;
        }
    },
};

export type BacktraceDatabaseFileRecord = ReportBacktraceDatabaseFileRecord | AttachmentBacktraceDatabaseFileRecord;
