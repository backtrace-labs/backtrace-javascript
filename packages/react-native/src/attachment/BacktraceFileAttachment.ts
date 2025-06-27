import { type BacktraceAttachment } from '@backtrace/sdk-core';
import { NativeModules, Platform } from 'react-native';
import type { ReactNativeFileProvider } from '../storage';
import { type FileLocation } from '../types/FileLocation';
export class BacktraceFileAttachment implements BacktraceAttachment<FileLocation> {
    private readonly _fileSystemProvider: ReactNativeFileProvider = NativeModules.BacktraceFileSystemProvider;

    public readonly name: string;
    public readonly mimeType: string;

    private readonly _uploadUri: string;
    constructor(
        public readonly filePath: string,
        name?: string,
        mimeType?: string,
    ) {
        this.name = name ?? filePath;
        this.mimeType = mimeType ?? 'application/octet-stream';
        this._uploadUri = Platform.OS === 'android' ? `file://${this.filePath}` : this.filePath;
    }

    public get(): FileLocation | undefined {
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
