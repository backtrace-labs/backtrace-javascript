import { ReportData } from '../../model/report/ReportData';
import { BacktraceAttributeProvider } from './BacktraceAttributeProvider';
import { ReportDataBuilder } from './ReportDataBuilder';

export class AttributeManager {
    private readonly _attributeProviders: BacktraceAttributeProvider[] = [];

    constructor(providers: BacktraceAttributeProvider[]) {
        for (const provider of providers) {
            this.addProvider(provider);
        }
    }

    /**
     * Adds attributes to manager cache
     * @param attributes attributes object
     */
    public add(attributes: Record<string, unknown> | (() => Record<string, unknown>)) {
        if (typeof attributes === 'function') {
            this.addProvider({ type: 'dynamic', get: attributes });
        } else {
            this.addProvider({ type: 'scoped', get: () => attributes });
        }
    }

    /**
     * Adds attribute provider to the manager
     * @param attributeProvider
     * @returns
     */
    public addProvider(attributeProvider: BacktraceAttributeProvider) {
        if (attributeProvider.type === 'dynamic') {
            this._attributeProviders.push(attributeProvider);
            return;
        } else {
            const attributes = attributeProvider.get();
            this._attributeProviders.push({
                type: 'scoped',
                get: () => attributes,
            });
        }
    }

    /**
     * Gets client attributes
     * @returns Report attribute - client attributes and annotations
     */
    public get(): ReportData {
        const result = {
            annotations: {},
            attributes: {},
        };

        for (const attributeProvider of this._attributeProviders) {
            const providerResult = ReportDataBuilder.build(attributeProvider.get());

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
}
