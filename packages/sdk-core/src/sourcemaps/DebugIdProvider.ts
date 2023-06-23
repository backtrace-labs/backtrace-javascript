import { BacktraceStackTraceConverter } from '../modules/converter';
import { DebugIdMapProvider } from './interfaces/DebugIdMapProvider';

export const SOURCE_DEBUG_ID_VARIABLE = '_btDebugIds';

export class DebugIdProvider {
    private readonly _fileDebugIds: Record<string, string> = {};

    constructor(
        private readonly _stackTraceConverter: BacktraceStackTraceConverter,
        private readonly _debugIdMapProvider?: DebugIdMapProvider,
    ) {}

    public loadDebugIds(debugIdMap?: Record<string, string>) {
        if (!debugIdMap) {
            debugIdMap = this._debugIdMapProvider?.getDebugIdMap();
            if (!debugIdMap) {
                return;
            }
        }

        const message = new Error().message;
        const result: Record<string, string> = {};
        for (const entry in Object.entries(debugIdMap)) {
            const [rawStack, debugId] = entry;
            const frames = this._stackTraceConverter.convert(rawStack, message);
            if (!frames.length) {
                continue;
            }

            // The first frame will have the file's path
            const frame = frames[0];
            result[frame.library] = debugId;
        }

        Object.assign(this._fileDebugIds, result);

        return result;
    }

    public getDebugId(file: string): string | undefined {
        return this._fileDebugIds[file];
    }
}
