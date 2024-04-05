import { Asset, log, LogLevel } from '@backtrace/sourcemap-tools';
import { CliLogger } from '../logger';
import { SourceAndOptionalSourceMapPaths } from '../models/Asset';

export function createAssetLogger(
    logger: CliLogger,
): (level: LogLevel) => <T extends Asset>(message: string | ((t: T) => string)) => (asset: T) => T;
export function createAssetLogger(
    logger: CliLogger,
    level: LogLevel,
): <T extends Asset>(message: string | ((t: T) => string)) => (asset: T) => T;
export function createAssetLogger(logger: CliLogger, level?: LogLevel) {
    function logAsset(level: LogLevel) {
        const logFn = log(logger, level);

        return function logAsset<T extends Asset>(message: string | ((t: T) => string)) {
            return function logAsset(asset: T) {
                return logFn<T>((t) => `${t.name}: ${typeof message === 'function' ? message(asset) : message}`)(asset);
            };
        };
    }

    return level ? logAsset(level) : logAsset;
}

export const logAssets =
    (logger: CliLogger, level: LogLevel) =>
    (message: string) =>
    <T extends SourceAndOptionalSourceMapPaths>(assets: T) =>
        log(logger, level)<T>(`${assets.source.name}:${assets.sourceMap?.name ?? '?'}: ${message}`)(assets);
