import { IdGenerator } from '../../../common/IdGenerator.js';
import { TimeHelper } from '../../../common/TimeHelper.js';

export interface BacktraceDatabaseRecord<Type extends string = string> {
    readonly id: string;
    readonly type: Type;
    readonly timestamp: number;
    readonly sessionId?: string;
    /**
     * Determines if the record is in use
     */
    locked: boolean;
}

export class BacktraceDatabaseRecordFactory {
    public create<Type extends string>(type: Type): BacktraceDatabaseRecord<Type> {
        return {
            id: IdGenerator.uuid(),
            timestamp: TimeHelper.now(),
            type,
            locked: false,
        };
    }
}

export type BacktraceDatabaseRecordCountByType = Record<BacktraceDatabaseRecord['type'], number>;
