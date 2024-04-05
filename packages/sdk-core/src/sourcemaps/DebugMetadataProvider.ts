import { BacktraceStackTraceConverter } from '../modules/converter';
import { DebugIdMapProvider, DebugMetadataMapProvider } from './interfaces/DebugMetadataMapProvider';
import { DebugMetadata } from './models/DebugMetadata';

export class DebugMetadataProvider {
    private _fileDebugMetadatas: Record<string, DebugMetadata>;

    constructor(
        private readonly _stackTraceConverter: BacktraceStackTraceConverter,
        private readonly _debugMetadataMapProvider?: DebugMetadataMapProvider | DebugIdMapProvider,
    ) {
        this._fileDebugMetadatas = this.loadDebugMetadatas();
    }

    public getDebugMetadata(file: string): DebugMetadata | undefined {
        return this._fileDebugMetadatas[file];
    }

    private loadDebugMetadatas() {
        if (!this._debugMetadataMapProvider) {
            return {};
        }

        const debugMetadataMap =
            'getDebugMetadataMap' in this._debugMetadataMapProvider
                ? this._debugMetadataMapProvider.getDebugMetadataMap()
                : this._debugMetadataMapProvider.getDebugIdMap();

        if (!debugMetadataMap) {
            return {};
        }

        const message = new Error().message;
        const result: Record<string, DebugMetadata> = {};
        for (const [rawStack, debugMetadata] of Object.entries(debugMetadataMap)) {
            let debugId: string | undefined;
            let symbolicationSource: string | undefined;

            if (Array.isArray(debugMetadata)) {
                debugId = debugMetadata[1];
                symbolicationSource = debugMetadata[2];
            } else if (typeof debugMetadata === 'string') {
                debugId = debugMetadata;
            }

            if (!debugId) {
                continue;
            }

            const frames = this._stackTraceConverter.convert(rawStack, message);
            if (!frames.length) {
                continue;
            }

            // The first frame will have the file's path
            const frame = frames[0];
            result[frame.library] = { debugId, symbolicationSource };
        }

        return result;
    }
}
