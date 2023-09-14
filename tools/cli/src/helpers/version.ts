import { R, parseJSON, pipe, readFile } from '@backtrace-labs/sourcemap-tools';
import path from 'path';

interface PackageJson {
    readonly version: string;
}

export function loadVersion() {
    const packageJsonPath = require.main?.path
        ? path.join(require.main?.path, '..', 'package.json')
        : path.join(__dirname, '../../package.json');

    return pipe(
        packageJsonPath,
        readFile,
        R.map(parseJSON<PackageJson>),
        R.map((p) => p.version),
    );
}
