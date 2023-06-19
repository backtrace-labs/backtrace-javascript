import { BacktraceStackTraceConverter } from '../..';
import { SdkOptions } from '../../builder/SdkOptions';
import { IdGenerator } from '../../common/IdGenerator';
import { TimeHelper } from '../../common/TimeHelper';
import { AttributeType, BacktraceData } from '../../model/data/BacktraceData';
import { BacktraceReport } from '../../model/report/BacktraceReport';
import { ReportDataBuilder } from '../attribute/ReportDataBuilder';

export class BacktraceDataBuilder {
    public readonly MAIN_THREAD_NAME = 'main';

    constructor(
        private readonly _sdkOptions: SdkOptions,
        private readonly _stackTraceConverter: BacktraceStackTraceConverter,
    ) {}

    public build(
        report: BacktraceReport,
        clientAttributes: Record<string, AttributeType> = {},
        clientAnnotations: Record<string, unknown> = {},
    ): BacktraceData {
        const reportData = ReportDataBuilder.build(report.attributes);

        return {
            uuid: IdGenerator.uuid(),
            timestamp: TimeHelper.toTimestampInSec(report.timestamp),
            agent: this._sdkOptions.agent,
            agentVersion: this._sdkOptions.agentVersion,
            lang: this._sdkOptions.langName,
            langVersion: this._sdkOptions.langVersion,
            classifiers: report.classifiers,
            mainThread: this.MAIN_THREAD_NAME,
            threads: {
                [this.MAIN_THREAD_NAME]: {
                    fault: true,
                    name: this.MAIN_THREAD_NAME,
                    stack: this._stackTraceConverter.convert(report),
                },
            },
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
    }
}