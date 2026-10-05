import { Platform } from 'react-native';
import { type FileSystem } from '../storage/';
import { type FileContent } from '../types/FileContent';
import { type FileLocation } from '../types/FileLocation';
import { BacktraceFileAttachment } from './BacktraceFileAttachment';

export interface FileSnapshotOptions {
    readonly queuedLines?: () => readonly string[];
    readonly maximumLines?: number;
    readonly maximumLength?: number;
}

// React Native on Android sizes a file part before sending it. A write in between aborts the upload.
export class FileSnapshotAttachment extends BacktraceFileAttachment {
    constructor(
        fileSystemProvider: FileSystem,
        filePath: string,
        name?: string,
        mimeType?: string,
        private readonly _options: FileSnapshotOptions = {},
    ) {
        super(fileSystemProvider, filePath, name, mimeType);
    }

    public get(): FileLocation | FileContent | undefined {
        if (Platform.OS !== 'android') {
            return super.get();
        }

        const content = this._fileSystemProvider.readFileSync(this.filePath) || '';
        const completeLines = content.substring(0, content.lastIndexOf('\n') + 1);
        const snapshot = this.newestLines(completeLines + this.linesNotInFile(completeLines));
        if (!snapshot) {
            return undefined;
        }

        return {
            string: snapshot,
            name: this.name,
            type: this.mimeType,
        };
    }

    private linesNotInFile(completeLines: string): string {
        const queued = this._options.queuedLines?.() ?? [];
        const lastLine = completeLines.substring(completeLines.lastIndexOf('\n', completeLines.length - 2) + 1);
        // Queued lines up to the file's last line have already reached the disk.
        return queued.slice(queued.indexOf(lastLine) + 1).join('');
    }

    private newestLines(snapshot: string): string {
        const { maximumLines = Infinity, maximumLength = Infinity } = this._options;
        const kept: string[] = [];
        let length = 0;
        for (const line of (snapshot.match(/[^\n]*\n/g) ?? []).reverse()) {
            if (kept.length >= maximumLines || length + line.length > maximumLength) {
                break;
            }
            kept.push(line);
            length += line.length;
        }
        return kept.reverse().join('');
    }
}
