import { AttributeType } from '../../model/data/BacktraceData';
import { BacktraceReport } from '../../model/report/BacktraceReport';

export class AttributeConverter {
    public convert(
        report: BacktraceReport,
        clientAttributes: Record<string, AttributeType>,
        clientAnnotations: Record<string, object>,
    ): { attributes: Record<string, AttributeType>; annotations: Record<string, unknown> } {
        const annotations: Record<string, unknown> = {
            ...clientAnnotations,
            ...report.annotations,
        };

        const attributes: Record<string, AttributeType> = {
            ...clientAttributes,
        };

        for (const attributeKey in report.attributes) {
            const value = report.attributes[attributeKey];
            if (value == null) {
                attributes[attributeKey] = value;
            }

            switch (typeof value) {
                case 'object': {
                    annotations[attributeKey] = value;
                    break;
                }
                case 'bigint': {
                    attributes[attributeKey] = value.toString();
                    break;
                }
                default: {
                    attributes[attributeKey] = value as AttributeType;
                }
            }
        }

        return { attributes, annotations };
    }
}
