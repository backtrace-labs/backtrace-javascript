import { BacktraceAttachment } from '@backtrace/sdk-core';
import { Readable } from 'stream';
import { BacktraceSetupConfiguration } from '../BacktraceConfiguration';
import { BacktraceFileAttachment } from './BacktraceFileAttachment';

/**
 * Transform a client attachment into the attachment model.
 */
export function transformAttachment(
    attachment: NonNullable<BacktraceSetupConfiguration['attachments']>[number] | BacktraceAttachment,
): BacktraceAttachment<Buffer | Readable | string | Uint8Array> {
    return typeof attachment === 'string'
        ? new BacktraceFileAttachment(attachment)
        : (attachment as BacktraceAttachment<Buffer | Readable | string | Uint8Array>);
}
