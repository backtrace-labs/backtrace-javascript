import webpack from 'webpack';
import { AssetStats } from '../models/AssetStats';

function statToString(stat: boolean | string | Error) {
    if (typeof stat === 'string') {
        return stat;
    }

    if (typeof stat === 'boolean') {
        return stat ? 'successful' : 'skipped';
    }

    return stat.message;
}

export function statsPrinter(logger: webpack.Compilation['logger']) {
    return function printStats(key: string, stats: AssetStats) {
        const errors = [stats.sourceComment, stats.sourceMapAppend, stats.sourceMapUpload, stats.sourceSnippet].some(
            (v) => v instanceof Error,
        );

        const infoLog = errors
            ? (...args: unknown[]) => logger.error(...args)
            : (...args: unknown[]) => logger.info(...args);

        const debugLog = errors
            ? (...args: unknown[]) => logger.error(...args)
            : (...args: unknown[]) => logger.log(...args);

        if (!errors) {
            if (stats.sourceMapUpload !== false && !(stats.sourceMapUpload instanceof Error)) {
                infoLog(`[${key}] processed file and uploaded sourcemap successfully`);
            } else {
                infoLog(`[${key}] processed file successfully`);
            }
        } else {
            debugLog(`[${key}] processed file with errors`);
        }

        debugLog(`\tdebugId: ${stats.debugId}`);

        if (stats.sourceSnippet != null) {
            debugLog(`\tsource snippet append: ${statToString(stats.sourceSnippet) ?? '<disabled>'}`);
        }

        if (stats.sourceComment != null) {
            debugLog(`\tsource comment append: ${statToString(stats.sourceComment) ?? '<disabled>'}`);
        }

        if (stats.sourceMapAppend != null) {
            debugLog(`\tsourcemap key append: ${statToString(stats.sourceMapAppend) ?? '<disabled>'}`);
        }

        if (stats.sourceMapUpload != null) {
            if (stats.sourceMapUpload === false || stats.sourceMapUpload instanceof Error) {
                debugLog(`\tsourcemap upload: ${statToString(stats.sourceMapUpload)}`);
            } else {
                debugLog(
                    `\tsourcemap upload: yes, rxid: ${stats.sourceMapUpload.rxid}, debugId: ${stats.sourceMapUpload.debugId}`,
                );
            }
        }
    };
}
