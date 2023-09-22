import { BacktraceCoreClient } from '..';
import { Events } from '../common/Events';
import { ReportEvents } from '../events/ReportEvents';

export interface BacktraceModuleBindData {
    readonly client: BacktraceCoreClient;
    readonly reportEvents: Events<ReportEvents>;
}

export interface BacktraceModule {
    bind?(client: BacktraceModuleBindData): void;
    initialize(): void;
    dispose?(): void;
}
