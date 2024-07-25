import { BacktraceAttachment } from '../model/attachment';

export type AttachmentEvents = {
    'attachments-updated'(attachments: BacktraceAttachment[]): void;
};
