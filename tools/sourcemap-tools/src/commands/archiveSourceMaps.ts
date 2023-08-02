import fs from 'fs';
import path from 'path';
import { SourceProcessor } from '../SourceProcessor';
import { ZipArchive } from '../ZipArchive';
import { AsyncResult, ResultPromise } from '../models/AsyncResult';
import { Ok, Result, flatMap } from '../models/Result';

export function archiveSourceMaps(sourceProcessor: SourceProcessor) {
    return function archiveSourceMaps(sourceMaps: string[]) {
        return AsyncResult.fromValue<string[], string>(sourceMaps)
            .then(readDebugIds(sourceProcessor))
            .then(createArchive).inner;
    };
}

function readDebugIds(sourceProcessor: SourceProcessor) {
    return async function readDebugIds(files: string[]): Promise<Result<(readonly [string, string])[], string>> {
        return flatMap(
            await Promise.all(
                files.map(
                    (file) =>
                        AsyncResult.equip(sourceProcessor.getSourceMapFileDebugId(file)).then(
                            (result) => [file, result] as const,
                        ).inner,
                ),
            ),
        );
    };
}

async function createArchive(pathsToArchive: (readonly [string, string])[]): ResultPromise<ZipArchive, string> {
    const archive = new ZipArchive();

    for (const [filePath, debugId] of pathsToArchive) {
        const fileName = path.basename(filePath);
        const readStream = fs.createReadStream(filePath);
        archive.append(`${debugId}-${fileName}`, readStream);
    }

    await archive.finalize();
    return Ok(archive);
}
