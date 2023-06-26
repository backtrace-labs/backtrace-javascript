import { DebugIdGenerator, SourceMapUploader } from '@backtrace/sourcemap-tools';

export interface BacktracePluginOptions {
    debugIdGenerator?: DebugIdGenerator;
    sourceMapUploader?: SourceMapUploader;
    uploadUrl?: string | URL;
}
