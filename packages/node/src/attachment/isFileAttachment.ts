import { BacktraceAttachment } from '@backtrace/sdk-core';
import { BacktraceFileAttachment } from './BacktraceFileAttachment.js';

export function isFileAttachment(attachment: BacktraceAttachment): attachment is BacktraceFileAttachment {
    return (
        attachment instanceof BacktraceFileAttachment ||
        ('filePath' in attachment && typeof attachment.filePath === 'string')
    );
}
