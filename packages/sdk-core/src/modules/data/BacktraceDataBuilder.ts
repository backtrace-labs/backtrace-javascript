import { BacktraceStackTraceConverter } from '../..';
import { SdkOptions } from '../../builder/SdkOptions';
import { IdGenerator } from '../../common/IdGenerator';
import { AttributeType, BacktraceData } from '../../model/data/BacktraceData';
import { BacktraceReport } from '../../model/report/BacktraceReport';
import { AttributeAndAnnotationConverter } from '../attribute/AttributeAndAnnotationConverter';

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
        const reportAttributes = AttributeAndAnnotationConverter.convert(report.attributes);

        return {
            uuid: IdGenerator.uuid(),
            timestamp: report.timestamp,
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
                ...reportAttributes.annotations,
                ...report.annotations,
            },
            attributes: {
                ...clientAttributes,
                ...reportAttributes.attributes,
            },
        };
    }
}
