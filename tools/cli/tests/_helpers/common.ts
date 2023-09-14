import { Ok, SymbolUploader } from '@backtrace-labs/sourcemap-tools';
import { Transform } from 'stream';

export function getHelpMessage() {
    return '';
}

export function mockUploader(rxid = 'rxid') {
    const blackhole = new Transform({
        transform(_, __, callback) {
            callback();
        },
    });

    return jest.spyOn(SymbolUploader.prototype, 'uploadSymbol').mockImplementation(async (readable) => {
        return new Promise((resolve) => readable.pipe(blackhole).on('finish', () => resolve(Ok({ rxid }))));
    });
}
