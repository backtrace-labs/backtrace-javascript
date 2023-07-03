import { SymbolUploaderOptions } from '@backtrace/sourcemap-tools';

export interface BacktracePluginOptions {
    /**
     * Upload URL for uploading sourcemap files.
     * See Source Maps Integration Guide for your instance for more information.
     *
     * If not set, the sourcemaps will not be uploaded. The sources will be still processed and ready for manual upload.
     */
    uploadUrl?: string | URL;

    /**
     * Additional upload options.
     */
    uploadOptions?: SymbolUploaderOptions;
}
