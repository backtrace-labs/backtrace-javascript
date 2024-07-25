import { BacktraceAttachment } from '../model/attachment';

export type AttachmentEvents = {
    'scoped-attachments-updated'(attachments: BacktraceAttachment[]): void;
};
