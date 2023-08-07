import { SymbolUploader } from '../SymbolUploader';
import { ZipArchive } from '../ZipArchive';

export function uploadArchive(symbolUploader: SymbolUploader) {
    return function uploadArchive(archive: ZipArchive) {
        return symbolUploader.uploadSymbol(archive);
    };
}
