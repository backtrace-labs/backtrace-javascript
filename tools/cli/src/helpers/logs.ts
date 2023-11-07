import { Asset, log, LogLevel, ProcessAssetResult } from '@backtrace/sourcemap-tools';
import { CliLogger } from '../logger';
import { SourceAndSourceMapPaths } from '../models/Asset';

export function logAsset(logger: CliLogger, level: LogLevel) {
    const logFn = log(logger, level);

    return function logAsset<T extends Asset | ProcessAssetResult>(message: string | ((t: T) => string)) {
        return function logAsset(asset: T) {
            return logFn<T>(
                (t) =>
                    `${'name' in t ? t.name : t.asset.name}: ${
                        typeof message === 'function' ? message(asset) : message
                    }`,
            )(asset);
        };
    };
}

export const logAssets =
    (logger: CliLogger, level: LogLevel) =>
    (message: string) =>
    <T extends SourceAndSourceMapPaths>(assets: T) =>
        log(logger, level)<T>(`${assets.source.name}: ${message}`)(assets);
