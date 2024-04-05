import { DebugIdMapProvider, DebugMetadataMapProvider } from './interfaces/DebugMetadataMapProvider';

export const SOURCE_DEBUG_ID_VARIABLE = '_btDebugIds';
export const SOURCE_DEBUG_METADATA_VARIABLE = '_btDebugData';

export interface DebugMetadataContainer {
    [SOURCE_DEBUG_ID_VARIABLE]?: Record<string, unknown>;
    [SOURCE_DEBUG_METADATA_VARIABLE]?: Record<string, unknown>;
}

/**
 * @deprecated use `DebugMetadataContainer` instead.
 */
export type DebugIdContainer = DebugMetadataContainer;

export class VariableDebugMetadataMapProvider implements DebugMetadataMapProvider, DebugIdMapProvider {
    constructor(private readonly _variable: DebugMetadataContainer) {}

    public getDebugMetadataMap(): Record<string, unknown> {
        return this._variable[SOURCE_DEBUG_METADATA_VARIABLE] ?? this.getDebugIdMap();
    }

    public getDebugIdMap(): Record<string, unknown> {
        return this._variable[SOURCE_DEBUG_ID_VARIABLE] ?? {};
    }
}

/**
 * @deprecated use `VariableDebugMetadataMapProvider` instead.
 */
export const VariableDebugIdMapProvider = VariableDebugMetadataMapProvider;
