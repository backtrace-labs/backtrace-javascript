import {
    AttachmentManager,
    BacktraceModule,
    BacktraceModuleBindData,
    FileSystem,
    SessionFiles,
} from '@backtrace/sdk-core';
import { BacktraceFileAttachment } from './BacktraceFileAttachment';

const ATTACHMENT_FILE_NAME = 'bt-attachments';

type SavedAttachment = [path: string, name: string];

export class FileAttachmentsManager implements BacktraceModule {
    private _attachmentsManager?: AttachmentManager;

    constructor(
        private readonly _fileSystem: FileSystem,
        private _fileName?: string,
    ) {}

    public static create(fileSystem: FileSystem) {
        return new FileAttachmentsManager(fileSystem);
    }

    public static createFromSession(sessionFiles: SessionFiles, fileSystem: FileSystem) {
        const fileName = sessionFiles.getFileName(ATTACHMENT_FILE_NAME);
        return new FileAttachmentsManager(fileSystem, fileName);
    }

    public initialize(): void {
        this.saveAttachments();
    }

    public bind({ attachmentManager, sessionFiles }: BacktraceModuleBindData): void {
        if (this._fileName) {
            throw new Error('This instance is already bound.');
        }

        if (!sessionFiles) {
            return;
        }

        this._fileName = sessionFiles.getFileName(ATTACHMENT_FILE_NAME);
        this._attachmentsManager = attachmentManager;
        attachmentManager.attachmentEvents.on('scoped-attachments-updated', () => this.saveAttachments());
    }

    public dispose(): void {
        this._fileName = undefined;
    }

    public async get(): Promise<BacktraceFileAttachment[]> {
        if (!this._fileName) {
            return [];
        }

        try {
            const content = await this._fileSystem.readFile(this._fileName);
            const attachments = JSON.parse(content) as SavedAttachment[];
            return attachments.map(([path, name]) => new BacktraceFileAttachment(path, name));
        } catch {
            return [];
        }
    }

    private async saveAttachments() {
        if (!this._fileName || !this._attachmentsManager) {
            return;
        }

        const fileAttachments = this._attachmentsManager
            .get('scoped')
            .filter((f): f is BacktraceFileAttachment => f instanceof BacktraceFileAttachment)
            .map<SavedAttachment>((f) => [f.filePath, f.name]);

        await this._fileSystem.writeFile(this._fileName, JSON.stringify(fileAttachments));
    }
}
