import { type BacktraceFileAttachment as CoreBacktraceFileAttachment } from '@backtrace-labs/sdk-core';
import { type ReactNativeFileProvider } from '../storage/ReactNativeFileProvider';
export class BacktraceFileAttachment implements CoreBacktraceFileAttachment {
    public readonly name: string;
    public readonly mimeType: string;

    constructor(
        private readonly _fileSystemProvider: ReactNativeFileProvider,
        public readonly filePath: string,
        name?: string,
        mimeType?: string,
    ) {
        this.name = name ?? filePath;
        this.mimeType = mimeType ?? 'application/octet-stream';
    }

    public get() {
        const exists = this._fileSystemProvider.existsSync(this.filePath);

        if (!exists) {
            return undefined;
        }
        return {
            uri: `file://${this.filePath}`,
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
