import { ReportData } from '../../model/report/ReportData';
import { BacktraceAttributeProvider } from './BacktraceAttributeProvider';
import { ReportDataBuilder } from './ReportDataBuilder';

export class AttributeManager {
    private readonly _attributeSources: Array<Record<string, unknown> | (() => Record<string, unknown>)> = [];

    constructor(providers: BacktraceAttributeProvider[]) {
        for (const provider of providers) {
            this.addProvider(provider);
        }
    }

    /**
     * Adds attributes to manager cache
     * @param attributes attributes object
     */
    public add(attributes: Record<string, unknown>) {
        this._attributeSources.push(attributes);
    }

    /**
     * Adds attribute provider to the manager
     * @param attributeProvider
     * @returns
     */
    public async addProvider(attributeProvider: BacktraceAttributeProvider) {
        if (attributeProvider.type === 'dynamic') {
            this._attributeSources.push(() => attributeProvider.get());
            return;
        }
        const attributes = attributeProvider.get();
        this._attributeSources.push(attributes);
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

        for (const attributeProvider of this._attributeSources) {
            const providerResult = ReportDataBuilder.build(
                typeof attributeProvider === 'function' ? attributeProvider() : attributeProvider,
            );

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
