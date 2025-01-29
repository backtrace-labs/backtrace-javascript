import { BacktraceSubmitResponse } from '../../submit/index.js';

export interface BacktraceAttachmentResponse extends BacktraceSubmitResponse {
    attachment_name: string;
    attachment_id: string;
    object: string;
}
