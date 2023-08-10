import { AsyncResult, parseJSON, readFile } from '@backtrace/sourcemap-tools';
import path from 'path';

interface PackageJson {
    readonly version: string;
}

export function loadVersion() {
    const packageJsonPath = require.main?.path
        ? path.join(require.main?.path, '..', 'package.json')
        : path.join(__dirname, '../../package.json');

    return AsyncResult.equip(readFile(packageJsonPath))
        .then(parseJSON<PackageJson>)
        .then((p) => p.version).inner;
}
