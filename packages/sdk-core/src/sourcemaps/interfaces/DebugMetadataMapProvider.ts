export interface DebugMetadataMapProvider {
    getDebugMetadataMap(): Record<string, unknown>;
}

/**
 * @deprecated use `DebugMetadataMapProvider` instead.
 */
export interface DebugIdMapProvider {
    getDebugIdMap(): Record<string, unknown>;
}
