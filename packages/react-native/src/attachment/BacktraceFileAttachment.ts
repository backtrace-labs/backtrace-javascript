import { type BacktraceFileAttachment as CoreBacktraceFileAttachment } from '@backtrace/sdk-core';
import { Platform } from 'react-native';
import { type FileSystem } from '../storage/';
import { type FileLocation } from '../types/FileLocation';
export class BacktraceFileAttachment implements CoreBacktraceFileAttachment {
    public readonly name: string;
    public readonly mimeType: string;

    private readonly _uploadUri: string;
    constructor(
        private readonly _fileSystemProvider: FileSystem,
        public readonly filePath: string,
        name?: string,
        mimeType?: string,
    ) {
        this.name = name ?? filePath;
        this.mimeType = mimeType ?? 'application/octet-stream';
        this._uploadUri = Platform.OS === 'android' ? `file://${this.filePath}` : this.filePath;
    }

    public get(): FileLocation | string | undefined {
        const exists = this._fileSystemProvider.existsSync(this.filePath);

        if (!exists) {
            return undefined;
        }
        return {
            uri: this._uploadUri,
            name: this.name,
            filename: this.name,
            type: this.mimeType,
            filepath: this.filePath,
        };
    }

    public toJSON() {
        return {
            filePath: this.filePath,
            name: this.name,
        };
    }
}
