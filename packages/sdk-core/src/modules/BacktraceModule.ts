import { BacktraceConfiguration, BacktraceCoreClient, BacktraceRequestHandler, FileSystem, SessionFiles } from '..';
import { Events } from '../common/Events';
import { ReportEvents } from '../events/ReportEvents';
import { BacktraceReportSubmission } from '../model/http/BacktraceReportSubmission';
import { AttachmentManager } from './attachments/AttachmentManager';
import { AttributeManager } from './attribute/AttributeManager';
import { BacktraceDatabase } from './database/BacktraceDatabase';

export interface BacktraceModuleBindData {
    readonly client: BacktraceCoreClient;
    readonly options: BacktraceConfiguration;
    readonly attributeManager: AttributeManager;
    readonly attachmentManager: AttachmentManager;
    readonly reportEvents: Events<ReportEvents>;
    readonly reportSubmission: BacktraceReportSubmission;
    readonly requestHandler: BacktraceRequestHandler;
    readonly database?: BacktraceDatabase;
    readonly sessionFiles?: SessionFiles;
    readonly fileSystem?: FileSystem;
}

export interface BacktraceModule {
    bind?(client: BacktraceModuleBindData): void;
    initialize?(): void;
    dispose?(): void;
}
