import {
    BacktraceConfiguration,
    BacktraceCoreClient,
    BacktraceRequestHandler,
    BacktraceStorageModule,
    SessionFiles,
} from '../index.js';
import { BacktraceReportSubmission } from '../model/http/BacktraceReportSubmission.js';
import { AttachmentManager } from './attachments/AttachmentManager.js';
import { AttributeManager } from './attribute/AttributeManager.js';
import { BacktraceDatabase } from './database/BacktraceDatabase.js';

export interface BacktraceModuleBindData<O extends BacktraceConfiguration = BacktraceConfiguration> {
    readonly client: BacktraceCoreClient;
    readonly options: O;
    readonly attributeManager: AttributeManager;
    readonly attachmentManager: AttachmentManager;
    readonly reportSubmission: BacktraceReportSubmission;
    readonly requestHandler: BacktraceRequestHandler;
    readonly database?: BacktraceDatabase;
    readonly sessionFiles?: SessionFiles;
    readonly storage?: BacktraceStorageModule;
}

export interface BacktraceModule<O extends BacktraceConfiguration = BacktraceConfiguration> {
    bind?(client: BacktraceModuleBindData<O>): void;
    initialize?(): void;
    dispose?(): void;
}
