import { BacktraceSubmissionResponse } from './BacktraceSubmissionResponse.js';

export interface BacktraceAttachmentResponse extends BacktraceSubmissionResponse {
    attachment_name: string;
    attachment_id: string;
    object: string;
}
