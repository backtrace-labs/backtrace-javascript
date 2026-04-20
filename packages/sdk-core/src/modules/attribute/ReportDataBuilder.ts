import { AttributeType } from '../../model/data/BacktraceData.js';
import { ReportData } from '../../model/report/ReportData.js';

export class ReportDataBuilder {
    public static build(attributes: Record<string, unknown>): ReportData {
        const result: ReportData = { annotations: {}, attributes: {} };
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
                    try {
                        // try to convert known objects into attributes
                        if (attribute instanceof Date) {
                            result.attributes[attributeKey] = attribute.toISOString();
                            break;
                        } else if (attribute instanceof URL) {
                            result.attributes[attributeKey] = attribute.toString();
                            break;
                        }
                    } catch {
                        // invalid attribute type - not able to serialize, skip it.
                        break;
                    }
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
