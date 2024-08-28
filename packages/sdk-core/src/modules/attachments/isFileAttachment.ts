import { BacktraceAttachment, BacktraceFileAttachment } from '../../model/attachment';

export function isFileAttachment(attachment: BacktraceAttachment): attachment is BacktraceFileAttachment {
    return 'filePath' in attachment && typeof attachment.filePath === 'string';
}
