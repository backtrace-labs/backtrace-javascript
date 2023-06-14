export interface BacktraceAttributeProvider {
    get type(): 'scoped' | 'dynamic';

    get(): Record<string, unknown>;
}
