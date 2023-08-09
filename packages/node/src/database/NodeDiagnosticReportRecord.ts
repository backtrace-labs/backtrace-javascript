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
            const report = JSON.parse(json) as NodeDiagnosticReport;

            const jsStack = report.javascriptStack.stack;
            const validJsStack = jsStack && jsStack[0] !== 'Unavailable.';

            const message = validJsStack ? report.javascriptStack.message : report.header.event;
            const btReport = new BacktraceReport(message, {
                timestamp: parseInt(report.header.dumpEventTimeStamp),
                hostname: report.header.host,
                classifiers: [report.header.trigger],
                ...this.getUnameData(report),
                ...this.getCpuData(report),
                ...this.getMemoryData(report),

                // Annotations
                'Environment Variables': report.environmentVariables,
                'Exec Arguments': report.header.commandLine,
                Error: report,
            });

            if (validJsStack) {
                btReport.addStackTrace('main', jsStack.join('\n'));
            }

            const nativeStack = report.nativeStack;
            if (nativeStack) {
                const nativeFrames = nativeStack.map<BacktraceStackFrame>((frame) => ({
                    funcName: frame.symbol,
                    library: 'v8',
                }));

                // If the JS stack is valid, add as 'native', otherwise 'main'
                const threadName = validJsStack ? 'native' : 'main';
                btReport.addStackTrace(threadName, nativeFrames);
            }

            const isOom = report.header.event === 'Allocation failed - JavaScript heap out of memory';
            const errorType: BacktraceErrorType = isOom ? 'OOMException' : 'Exception';
            btReport.attributes['error.type'] = errorType;

            const data = dataBuilder.build(btReport);

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

    private static getUnameData(report: NodeDiagnosticReport) {
        return {
            'uname.sysname': report.header.osName,
            'uname.release': report.header.osRelease,
            'uname.version': report.header.osVersion,
            'uname.machine': report.header.osMachine,
        };
    }

    private static getCpuData(report: NodeDiagnosticReport) {
        const cpu = report.header.cpus[0];
        return {
            'cpu.arch': report.header.arch,
            'cpu.brand': cpu.model,
            'cpu.frequency': cpu.speed,
            'cpu.user': cpu.user,
            'cpu.nice': cpu.nice,
            'cpu.sys': cpu.sys,
            'cpu.idle': cpu.idle,
            'cpu.irq': cpu.irq,
            'cpu.count': report.header.cpus.length,
        };
    }

    private static getMemoryData(report: NodeDiagnosticReport) {
        return {
            'vm.rss.size': Math.round(report.javascriptHeap.usedMemory / 1024),
            'vm.rss.peak': Math.round(report.javascriptHeap.totalMemory / 1024),
            'vm.rss.available': report.javascriptHeap.availableMemory,
        };
    }
}
