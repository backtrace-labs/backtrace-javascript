import { BacktraceAttachment } from './model/report/BacktraceAttachment';
import { BacktraceReport } from './model/report/BacktraceReport';

export class BacktraceCoreClient {
    public async send(report: BacktraceReport, attributes: Record<string, any>, attachments: BacktraceAttachment) {
        throw new Error('Not implemented');
    }
}
