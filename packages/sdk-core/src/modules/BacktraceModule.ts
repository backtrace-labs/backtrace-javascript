import { BacktraceConfiguration, BacktraceCoreClient, BacktraceRequestHandler, SessionFiles } from '..';
import { Events } from '../common/Events';
import { ReportEvents } from '../events/ReportEvents';
import { BacktraceReportSubmission } from '../model/http/BacktraceReportSubmission';
import { AttachmentManager } from './attachments/AttachmentManager';
import { AttributeManager } from './attribute/AttributeManager';

export interface BacktraceModuleBindData {
    readonly client: BacktraceCoreClient;
    readonly options: BacktraceConfiguration;
    readonly attributeManager: AttributeManager;
    readonly attachmentManager: AttachmentManager;
    readonly reportEvents: Events<ReportEvents>;
    readonly reportSubmission: BacktraceReportSubmission;
    readonly requestHandler: BacktraceRequestHandler;
    readonly sessionFiles?: SessionFiles;
}

export interface BacktraceModule {
    bind?(client: BacktraceModuleBindData): void;
    initialize?(): void;
    dispose?(): void;
}
