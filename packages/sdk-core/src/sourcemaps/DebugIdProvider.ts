import { BacktraceStackTraceConverter } from '../modules/converter';
import { DebugIdMapProvider } from './interfaces/DebugIdMapProvider';

export const SOURCE_DEBUG_ID_VARIABLE = '_btDebugIds';

export class DebugIdProvider {
    private readonly _fileDebugIds: Record<string, string>;

    constructor(
        private readonly _stackTraceConverter: BacktraceStackTraceConverter,
        private readonly _debugIdMapProvider?: DebugIdMapProvider,
    ) {
        this._fileDebugIds = this.loadDebugIds();
    }

    public getDebugId(file: string): string | undefined {
        return this._fileDebugIds[file];
    }

    private loadDebugIds() {
        const debugIdMap = this._debugIdMapProvider?.getDebugIdMap();
        if (!debugIdMap) {
            return {};
        }

        const message = new Error().message;
        const result: Record<string, string> = {};
        for (const [rawStack, debugId] of Object.entries(debugIdMap)) {
            const frames = this._stackTraceConverter.convert(rawStack, message);
            if (!frames.length) {
                continue;
            }

            // The first frame will have the file's path
            const frame = frames[0];
            result[frame.library] = debugId;
        }

        return result;
    }
}
