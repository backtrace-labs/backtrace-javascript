import { UploadResult } from '@backtrace/sourcemap-tools';

export interface AssetStats {
    debugId?: string;
    processSource?: boolean | string | Error;
    sourceMapUpload?: false | UploadResult | Error;
}
