import { BacktraceAttachment, BacktraceFileAttachment } from '../../model/attachment/index.js';

export function isFileAttachment(attachment: BacktraceAttachment): attachment is BacktraceFileAttachment {
    return 'filePath' in attachment && typeof attachment.filePath === 'string';
}
