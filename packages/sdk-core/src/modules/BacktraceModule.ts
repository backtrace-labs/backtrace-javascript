import {
    BacktraceConfiguration,
    BacktraceCoreClient,
    BacktraceRequestHandler,
    FileSystem,
    SessionFiles,
} from '../index.js';
import { BacktraceReportSubmission } from '../model/http/BacktraceReportSubmission.js';
import { AttachmentManager } from './attachments/AttachmentManager.js';
import { AttributeManager } from './attribute/AttributeManager.js';
import { BacktraceDatabase } from './database/BacktraceDatabase.js';

export interface BacktraceModuleBindData {
    readonly client: BacktraceCoreClient;
    readonly options: BacktraceConfiguration;
    readonly attributeManager: AttributeManager;
    readonly attachmentManager: AttachmentManager;
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
