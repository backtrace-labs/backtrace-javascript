import { AttributeType } from '../../model/data/BacktraceData';
import { ReportAttribute } from '../../model/report/ReportAttribute';
import { AttributeConverter } from './AttributeConverter';
import { BacktraceAttributeProvider } from './BacktraceAttributeProvider';

export class AttributeManager {
    public readonly attributes: Record<string, AttributeType> = {};
    public readonly annotations: Record<string, unknown> = {};

    private readonly _dynamicAttributeProviders: BacktraceAttributeProvider[] = [];

    constructor(providers: BacktraceAttributeProvider[]) {
        for (const provider of providers) {
            this.addProvider(provider);
        }
    }

    /**
     * Adds attributes to manager manager cache
     * @param attributes attributes object
     */
    public add(attributes: Record<string, unknown>) {
        this.addStaticAttributes(attributes);
    }

    /**
     * Adds attribute provider to the manager
     * @param attributeProvider
     * @returns
     */
    public async addProvider(attributeProvider: BacktraceAttributeProvider) {
        if (attributeProvider.type === 'dynamic') {
            this._dynamicAttributeProviders.push(attributeProvider);
        }
        const attributes = attributeProvider.get();
        this.addStaticAttributes(attributes);
        return;
    }

    /**
     * Gets client attributes
     * @returns Report attribute - client attributes and annotations
     */
    public get(): ReportAttribute {
        const result = {
            annotations: {
                ...this.annotations,
            },
            attributes: { ...this.attributes },
        };

        for (const attributeProvider of this._dynamicAttributeProviders) {
            const providerResult = AttributeConverter.convert(attributeProvider.get());
            result.attributes = {
                ...result.attributes,
                ...providerResult.attributes,
            };

            result.annotations = {
                ...result.annotations,
                ...providerResult.annotations,
            };
        }

        return result;
    }

    private addStaticAttributes(attributes: Record<string, unknown>) {
        const reportAttributes = AttributeConverter.convert(attributes);
        for (const attributeKey in reportAttributes.attributes) {
            this.attributes[attributeKey] = reportAttributes.attributes[attributeKey];
        }

        for (const annotationKey in reportAttributes.annotations) {
            this.annotations[annotationKey] = reportAttributes.attributes[annotationKey];
        }
    }
}
