import { BacktraceAttachment } from '@backtrace/sdk-core';
import { Readable } from 'stream';
import { BacktraceSetupConfiguration } from '../BacktraceConfiguration.js';
import { BacktraceFileAttachmentFactory } from './BacktraceFileAttachment.js';

/**
 * Transform a client attachment into the attachment model.
 */
export const transformAttachment =
    (fileAttachmentFactory: BacktraceFileAttachmentFactory) =>
    (
        attachment: NonNullable<BacktraceSetupConfiguration['attachments']>[number] | BacktraceAttachment,
    ): BacktraceAttachment<Buffer | Readable | string | Uint8Array> => {
        return typeof attachment === 'string'
            ? fileAttachmentFactory.create(attachment)
            : (attachment as BacktraceAttachment<Buffer | Readable | string | Uint8Array>);
    };
