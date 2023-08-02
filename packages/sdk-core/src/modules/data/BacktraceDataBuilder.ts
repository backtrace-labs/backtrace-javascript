import { BacktraceStackTraceConverter, DebugIdProvider } from '../..';
import { SdkOptions } from '../../builder/SdkOptions';
import { IdGenerator } from '../../common/IdGenerator';
import { TimeHelper } from '../../common/TimeHelper';
import { AttributeType, BacktraceData } from '../../model/data/BacktraceData';
import { BacktraceStackTrace } from '../../model/data/BacktraceStackTrace';
import { BacktraceReport } from '../../model/report/BacktraceReport';
import { ReportDataBuilder } from '../attribute/ReportDataBuilder';

export class BacktraceDataBuilder {
    public readonly MAIN_THREAD_NAME = 'main';

    constructor(
        private readonly _sdkOptions: SdkOptions,
        private readonly _stackTraceConverter: BacktraceStackTraceConverter,
        private readonly _debugIdProvider: DebugIdProvider,
    ) {}

    public build(
        report: BacktraceReport,
        clientAttributes: Record<string, AttributeType> = {},
        clientAnnotations: Record<string, unknown> = {},
    ): BacktraceData {
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
                ...clientAnnotations,
                ...reportData.annotations,
                ...report.annotations,
            },
            attributes: {
                ...clientAttributes,
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
            const { message, stack } = traceInfo;
            const stackFrames = this._stackTraceConverter.convert(stack, message);

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
