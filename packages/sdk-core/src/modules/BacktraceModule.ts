import { BacktraceCoreClient, SessionFiles } from '..';
import { Events } from '../common/Events';
import { ReportEvents } from '../events/ReportEvents';

export interface BacktraceModuleBindData {
    readonly client: BacktraceCoreClient;
    readonly reportEvents: Events<ReportEvents>;
    readonly sessionFiles?: SessionFiles;
}

export interface BacktraceModule {
    bind?(client: BacktraceModuleBindData): void;
    initialize(): void;
    dispose?(): void;
}
