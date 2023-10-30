export interface BacktraceAttributeProvider {
    /**
     * Return attribute provider type. Based on the type, attribute provider is being invoked
     * once or per every report.
     * - scoped: means the attribute provider will be invoked only once just after adding the
     *  provider to the client.
     * - dynamic: means the attribute will be invoked every time before the report data generation
     */
    get type(): 'scoped' | 'dynamic';

    /**
     * Generate provider attributes
     */
    get(): Record<string, unknown>;
}
