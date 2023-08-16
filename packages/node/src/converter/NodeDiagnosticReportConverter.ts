import { BacktraceErrorType, BacktraceReport } from '@backtrace/sdk-core';
import type { BacktraceStackFrame } from '@backtrace/sdk-core/lib/model/data/BacktraceStackTrace';
import { NodeDiagnosticReport } from '../database/models/NodeDiagnosticReport';

export class NodeDiagnosticReportConverter {
    public convert(report: NodeDiagnosticReport): BacktraceReport {
        const jsStack = report.javascriptStack.stack;
        const validJsStack = jsStack && jsStack[0] !== 'Unavailable.';

        const message = validJsStack ? report.javascriptStack.message : report.header.event;
        const btReport = new BacktraceReport(
            message,
            {
                hostname: report.header.host,
                ...this.getUnameData(report),
                ...this.getCpuData(report),
                ...this.getMemoryData(report),

                // Annotations
                'Environment Variables': report.environmentVariables,
                'Exec Arguments': report.header.commandLine,
                Error: report,
            },
            [],
            {
                timestamp: parseInt(report.header.dumpEventTimeStamp),
                classifiers: [report.header.trigger],
            },
        );

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
        const errorType: BacktraceErrorType = isOom ? 'OOMException' : 'Crash';
        btReport.attributes['error.type'] = errorType;

        return btReport;
    }

    private getUnameData(report: NodeDiagnosticReport) {
        return {
            'uname.sysname': report.header.osName,
            'uname.release': report.header.osRelease,
            'uname.version': report.header.osVersion,
            'uname.machine': report.header.osMachine,
        };
    }

    private getCpuData(report: NodeDiagnosticReport) {
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

    private getMemoryData(report: NodeDiagnosticReport) {
        return {
            'vm.rss.size': Math.round(report.javascriptHeap.usedMemory / 1024),
            'vm.rss.peak': Math.round(report.javascriptHeap.totalMemory / 1024),
            'vm.rss.available': report.javascriptHeap.availableMemory,
        };
    }
}
