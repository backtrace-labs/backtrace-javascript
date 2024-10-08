import { SdkOptions } from '../../builder/SdkOptions.js';
import { IdGenerator } from '../../common/IdGenerator.js';
import { TimeHelper } from '../../common/TimeHelper.js';
import { BacktraceStackTraceConverter, DebugIdProvider } from '../../index.js';
import { BacktraceData } from '../../model/data/BacktraceData.js';
import { BacktraceStackFrame, BacktraceStackTrace } from '../../model/data/BacktraceStackTrace.js';
import { BacktraceReport } from '../../model/report/BacktraceReport.js';
import { AttributeManager } from '../attribute/AttributeManager.js';
import { ReportDataBuilder } from '../attribute/ReportDataBuilder.js';

export class BacktraceDataBuilder {
    public readonly MAIN_THREAD_NAME = 'main';

    constructor(
        private readonly _sdkOptions: SdkOptions,
        private readonly _stackTraceConverter: BacktraceStackTraceConverter,
        private readonly _attributeManager: AttributeManager,
        private readonly _debugIdProvider: DebugIdProvider,
    ) {}

    public build(report: BacktraceReport): BacktraceData {
        const { annotations, attributes } = this._attributeManager.get();

        const reportData = ReportDataBuilder.build(report.attributes);
        const { threads, detectedDebugIdentifier } = this.getThreads(report);

        const result: BacktraceData = {
            uuid: IdGenerator.uuid(),
            timestamp: TimeHelper.toTimestampInSec(report.timestamp),
            agent: this._sdkOptions.agent,
            agentVersion: this._sdkOptions.agentVersion,
            lang: this._sdkOptions.langName,
            langVersion: this._sdkOptions.langVersion,
            classifiers: report.classifiers,
            mainThread: this.MAIN_THREAD_NAME,
            threads,
            annotations: {
                ...annotations,
                ...reportData.annotations,
                ...report.annotations,
            },
            attributes: {
                ...attributes,
                ...reportData.attributes,
            },
        };

        if (detectedDebugIdentifier) {
            result.symbolication = 'sourcemap';
        }

        return result;
    }

    private getThreads(report: BacktraceReport) {
        const threads: Record<string, BacktraceStackTrace> = {};
        let detectedDebugIdentifier = false;

        for (const [name, traceInfo] of Object.entries(report.stackTrace)) {
            let stackFrames: BacktraceStackFrame[];
            if (Array.isArray(traceInfo)) {
                stackFrames = traceInfo;
            } else {
                const { message, stack } = traceInfo;
                stackFrames = this._stackTraceConverter.convert(stack, message);
            }
            if (name === this.MAIN_THREAD_NAME && report.skipFrames > 0) {
                stackFrames.splice(0, report.skipFrames);
            }

            for (const frame of stackFrames) {
                const debugIdentifier = this._debugIdProvider.getDebugId(frame.library);
                if (!debugIdentifier) {
                    continue;
                }
                detectedDebugIdentifier = true;
                frame.debug_identifier = debugIdentifier;
            }

            threads[name] = {
                fault: name === this.MAIN_THREAD_NAME,
                name,
                stack: stackFrames,
            };
        }
        return {
            threads,
            detectedDebugIdentifier,
        };
    }
}
