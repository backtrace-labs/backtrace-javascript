import { Platform } from 'react-native';
import { type FileContent } from '../types/FileContent';
import { type FileLocation } from '../types/FileLocation';
import { BacktraceFileAttachment } from './BacktraceFileAttachment';

// React Native on Android sizes a file part before sending it. A write in between aborts the upload.
export class FileSnapshotAttachment extends BacktraceFileAttachment {
    public get(): FileLocation | FileContent | undefined {
        if (Platform.OS !== 'android') {
            return super.get();
        }

        const content = this._fileSystemProvider.readFileSync(this.filePath);
        const completeLines = content ? content.substring(0, content.lastIndexOf('\n') + 1) : '';
        if (!completeLines) {
            return undefined;
        }

        return {
            string: completeLines,
            name: this.name,
            type: this.mimeType,
        };
    }
}
