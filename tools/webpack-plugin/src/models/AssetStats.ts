import { UploadResult } from '@backtrace/sourcemap-tools';

export interface AssetStats {
    readonly debugId: string;
    sourceSnippet?: boolean | string | Error;
    sourceComment?: boolean | string | Error;
    sourceMapAppend?: boolean | string | Error;
    sourceMapUpload?: false | UploadResult | Error;
}
