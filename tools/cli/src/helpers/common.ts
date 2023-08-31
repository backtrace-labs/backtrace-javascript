import { Asset } from '@backtrace-labs/sourcemap-tools';

export function toAsset(file: string): Asset {
    return { name: file, path: file };
}
