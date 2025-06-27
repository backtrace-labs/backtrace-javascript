import {
    type BacktraceSyncStorage,
    type BacktraceFileAttachment as CoreBacktraceFileAttachment,
} from '@backtrace/sdk-core';
import { Platform } from 'react-native';
import { type FileLocation } from '../types/FileLocation';
export class BacktraceFileAttachment implements CoreBacktraceFileAttachment<FileLocation> {
    public readonly name: string;
    public readonly mimeType: string;

    private readonly _uploadUri: string;
    constructor(
        private readonly _storage: BacktraceSyncStorage,
        public readonly filePath: string,
        name?: string,
        mimeType?: string,
    ) {
        this.name = name ?? filePath;
        this.mimeType = mimeType ?? 'application/octet-stream';
        this._uploadUri = Platform.OS === 'android' ? `file://${this.filePath}` : this.filePath;
    }

    public get(): FileLocation | undefined {
        const exists = this._storage.hasSync(this.filePath);

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
