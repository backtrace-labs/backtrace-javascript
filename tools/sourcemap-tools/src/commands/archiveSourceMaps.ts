import path from 'path';
import { RawSourceMap } from 'source-map';
import { SourceProcessor } from '../SourceProcessor';
import { ZipArchive } from '../ZipArchive';
import { map } from '../helpers/common';
import { AssetWithContent, AssetWithDebugId } from '../models/Asset';
import { AsyncResult, ResultPromise } from '../models/AsyncResult';
import { Ok, Result } from '../models/Result';

type AssetWithDebugIdAndSourceMap = AssetWithContent<RawSourceMap> & AssetWithDebugId;

export function archiveSourceMaps(sourceProcessor: SourceProcessor) {
    return function archiveSourceMaps(sourceMaps: AssetWithContent<RawSourceMap>[]) {
        return AsyncResult.fromValue<AssetWithContent<RawSourceMap>[], string>(sourceMaps)
            .then(map(readDebugId(sourceProcessor)))
            .then(createArchive).inner;
    };
}

export function readDebugId(sourceProcessor: SourceProcessor) {
    return function readDebugId(asset: AssetWithContent<RawSourceMap>): Result<AssetWithDebugIdAndSourceMap, string> {
        return sourceProcessor.getSourceMapDebugId(asset.content).map((debugId) => ({ ...asset, debugId }));
    };
}

export async function createArchive(assets: AssetWithDebugIdAndSourceMap[]): ResultPromise<ZipArchive, string> {
    const archive = new ZipArchive();

    for (const asset of assets) {
        const fileName = path.basename(asset.name);
        archive.append(`${asset.debugId}-${fileName}`, JSON.stringify(asset.content));
    }

    await archive.finalize();
    return Ok(archive);
}
