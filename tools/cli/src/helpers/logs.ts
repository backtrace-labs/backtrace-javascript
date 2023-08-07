import { Asset, LogLevel, ProcessAssetResult, log } from '@backtrace/sourcemap-tools';
import { CliLogger } from '../logger';

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
