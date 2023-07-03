import { SOURCE_DEBUG_ID_VARIABLE } from './DebugIdProvider';
import { DebugIdMapProvider } from './interfaces/DebugIdMapProvider';

export interface DebugIdContainer {
    [SOURCE_DEBUG_ID_VARIABLE]?: Record<string, string>;
}

export class VariableDebugIdMapProvider implements DebugIdMapProvider {
    constructor(private readonly _variable: DebugIdContainer) {}

    public getDebugIdMap(): Record<string, string> {
        return this._variable[SOURCE_DEBUG_ID_VARIABLE] ?? {};
    }
}
