import { AttributeType } from '../../model/data/BacktraceData';
import { ReportAttribute } from '../../model/report/ReportAttribute';

export class AttributeConverter {
    public static convert(attributes: Record<string, unknown>): ReportAttribute {
        const result: ReportAttribute = { annotations: {}, attributes: {} };
        if (!attributes) {
            return result;
        }
        for (const attributeKey in attributes) {
            const attribute = attributes[attributeKey];
            if (attribute == null) {
                result.attributes[attributeKey] = attribute;
                continue;
            }
            switch (typeof attribute) {
                case 'object': {
                    result.annotations[attributeKey] = attribute;
                    break;
                }
                case 'bigint': {
                    result.attributes[attributeKey] = attribute.toString();
                    break;
                }
                default: {
                    result.attributes[attributeKey] = attribute as AttributeType;
                    break;
                }
            }
        }

        return result;
    }
}
