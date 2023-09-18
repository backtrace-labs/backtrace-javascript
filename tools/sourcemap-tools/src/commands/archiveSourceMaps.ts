import path from 'path';
import { RawSourceMap } from 'source-map';
import { SourceProcessor } from '../SourceProcessor';
import { ZipArchive } from '../ZipArchive';
import { AssetWithContent, AssetWithDebugId } from '../models/Asset';
import { Err, Ok, R, Result } from '../models/Result';

type AssetWithDebugIdAndSourceMap = AssetWithContent<RawSourceMap> & AssetWithDebugId;

export interface ArchiveWithSourceMapsAndDebugIds {
    readonly archive: ZipArchive;
    readonly assets: AssetWithDebugIdAndSourceMap[];
}

export function createArchive(sourceProcessor: SourceProcessor) {
    return function createArchive(
        assets: AssetWithContent<RawSourceMap>[],
    ): Result<ArchiveWithSourceMapsAndDebugIds, string> {
        const archive = new ZipArchive();

        const readResult = R.flatMap(assets.map(readDebugId(sourceProcessor)));
        if (readResult.isErr()) {
            return readResult;
        }

        return Ok({
            archive,
            assets: readResult.data,
        });
    };
}

export async function finalizeArchive(archive: ArchiveWithSourceMapsAndDebugIds) {
    for (const asset of archive.assets) {
        const fileName = path.basename(asset.name);
        archive.archive.append(`${asset.debugId}-${fileName}`, JSON.stringify(asset.content));
    }

    await archive.archive.finalize();
    return archive;
}

export function readDebugId(sourceProcessor: SourceProcessor) {
    return function readDebugId(asset: AssetWithContent<RawSourceMap>): Result<AssetWithDebugIdAndSourceMap, string> {
        const debugId = sourceProcessor.getSourceMapDebugId(asset.content);
        if (!debugId) {
            return Err('sourcemap has no debug id');
        }

        return Ok({
            ...asset,
            debugId,
        });
    };
}
