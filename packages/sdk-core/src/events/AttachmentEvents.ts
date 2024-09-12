import { BacktraceAttachment } from '../model/attachment/index.js';

export type AttachmentEvents = {
    'scoped-attachments-updated': [attachments: BacktraceAttachment[]];
};
