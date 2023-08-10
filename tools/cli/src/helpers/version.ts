import { AsyncResult, parseJSON, readFile } from '@backtrace/sourcemap-tools';
import path from 'path';

interface PackageJson {
    readonly version: string;
}

export function loadVersion() {
    return AsyncResult.equip(readFile(path.join(__dirname, '../../package.json')))
        .then(parseJSON<PackageJson>)
        .then((p) => p.version).inner;
}
