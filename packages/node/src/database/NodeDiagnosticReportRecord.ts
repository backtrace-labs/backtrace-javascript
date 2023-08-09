import { BacktraceData, BacktraceDatabaseRecord, BacktraceErrorType, BacktraceReport } from '@backtrace/sdk-core';
import type { BacktraceStackFrame } from '@backtrace/sdk-core/lib/model/data/BacktraceStackTrace';
import type { BacktraceDataBuilder } from '@backtrace/sdk-core/lib/modules/data/BacktraceDataBuilder';
import { BacktraceFileAttachment } from '../attachment';
import { NodeDiagnosticReport } from './models/NodeDiagnosticReport';

export class NodeDiagnosticReportRecord implements BacktraceDatabaseRecord {
    public readonly data: BacktraceData;
    public readonly id: string;
    public readonly count: number;
    public readonly hash: string;
    public locked: boolean;

    private constructor(record: BacktraceDatabaseRecord, public readonly attachments: BacktraceFileAttachment[]) {
        this.data = record.data;
        this.id = record.id;
        this.count = record.count;
        this.hash = record.hash;
        // make sure the database record stored in the database directory
        // is never locked. By doing this, we want to be sure once we load
        // the record once again, the record will be available for future usage
        this.locked = false;
    }

    public static fromRecord(record: BacktraceDatabaseRecord) {
        return new NodeDiagnosticReportRecord(
            record,
            record.attachments.filter((n) => n instanceof BacktraceFileAttachment) as BacktraceFileAttachment[],
        );
    }

    public static fromJson(
        id: string,
        json: string,
        dataBuilder: BacktraceDataBuilder,
    ): NodeDiagnosticReportRecord | undefined {
        try {
            const record = JSON.parse(json) as NodeDiagnosticReport;

            const jsStack = record.javascriptStack.stack;
            const validJsStack = jsStack && jsStack[0] !== 'Unavailable.';

            const message = validJsStack ? record.javascriptStack.message : record.header.event;
            const report = new BacktraceReport(message);

            if (validJsStack) {
                report.addStackTrace('main', jsStack.join('\n'));
            }

            const nativeStack = record.nativeStack;
            if (nativeStack) {
                const nativeFrames = nativeStack.map<BacktraceStackFrame>((frame) => ({
                    funcName: frame.symbol,
                    library: 'v8',
                }));

                // If the JS stack is valid, add as 'native', otherwise 'main'
                const threadName = validJsStack ? 'native' : 'main';
                report.addStackTrace(threadName, nativeFrames);
            }

            const isOom = record.header.event === 'Allocation failed - JavaScript heap out of memory';
            if (isOom) {
                const errorType: BacktraceErrorType = 'OOMException';
                report.attributes['error.type'] = errorType;
            }

            // TODO: Add more attributes

            const data = dataBuilder.build(report);

            return {
                id,
                count: 1,
                data,
                locked: false,
                attachments: [],
                hash: '',
            };
        } catch {
            return undefined;
        }
    }
}
