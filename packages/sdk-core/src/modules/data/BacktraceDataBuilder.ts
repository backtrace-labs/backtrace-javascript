import { BacktraceStackTraceConverter } from '../..';
import { SdkOptions } from '../../builder/SdkOptions';
import { IdGenerator } from '../../common/IdGenerator';
import { AttributeType, BacktraceData } from '../../model/data/BacktraceData';
import { BacktraceReport } from '../../model/report/BacktraceReport';
import { AttributeAndAnnotationBuilder } from './AttributeAndAnnotationBuilder';

export class BacktraceDataBuilder {
    public readonly MAIN_THREAD_NAME = 'main';

    constructor(
        private readonly _sdkOptions: SdkOptions,
        private readonly _stackTraceConverter: BacktraceStackTraceConverter,
        private readonly _attributeAndAnnotationBuilder: AttributeAndAnnotationBuilder = new AttributeAndAnnotationBuilder(),
    ) {}

    public build(
        report: BacktraceReport,
        clientAttributes: Record<string, AttributeType> = {},
        clientAnnotations: Record<string, object> = {},
    ): BacktraceData {
        const { attributes, annotations } = this._attributeAndAnnotationBuilder.generate(
            report,
            clientAttributes,
            clientAnnotations,
        );
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
            annotations,
            attributes,
        };
    }
}
