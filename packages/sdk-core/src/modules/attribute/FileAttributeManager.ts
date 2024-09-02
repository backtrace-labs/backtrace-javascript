import { jsonEscaper } from '../../common/jsonEscaper.js';
import { AttributeType } from '../../model/data/index.js';
import { BacktraceModule, BacktraceModuleBindData } from '../BacktraceModule.js';
import { FileSystem, SessionFiles } from '../storage/index.js';
import { AttributeManager } from './AttributeManager.js';

const ATTRIBUTE_FILE_NAME = 'bt-attributes';

export class FileAttributeManager implements BacktraceModule {
    private _attributeManager?: AttributeManager;

    constructor(
        private readonly _fileSystem: FileSystem,
        private _fileName?: string,
    ) {}

    public static create(fileSystem: FileSystem) {
        return new FileAttributeManager(fileSystem);
    }

    public static createFromSession(sessionFiles: SessionFiles, fileSystem: FileSystem) {
        const fileName = sessionFiles.getFileName(ATTRIBUTE_FILE_NAME);
        return new FileAttributeManager(fileSystem, fileName);
    }

    public initialize(): void {
        this.saveAttributes();
    }

    public bind({ attributeManager, sessionFiles }: BacktraceModuleBindData): void {
        if (this._fileName) {
            throw new Error('This instance is already bound.');
        }

        if (!sessionFiles) {
            return;
        }

        this._fileName = sessionFiles.getFileName(ATTRIBUTE_FILE_NAME);
        this._attributeManager = attributeManager;
        attributeManager.attributeEvents.on('scoped-attributes-updated', () => this.saveAttributes());
    }

    public dispose(): void {
        this._fileName = undefined;
    }

    public async get(): Promise<Record<string, AttributeType>> {
        if (!this._fileName) {
            return {};
        }

        try {
            const content = await this._fileSystem.readFile(this._fileName);
            return JSON.parse(content);
        } catch {
            return {};
        }
    }

    private async saveAttributes() {
        if (!this._fileName || !this._attributeManager) {
            return;
        }

        const reportData = this._attributeManager.get('scoped');
        await this._fileSystem.writeFile(this._fileName, JSON.stringify(reportData.attributes, jsonEscaper()));
    }
}
