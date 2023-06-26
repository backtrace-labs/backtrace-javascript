import fs from 'fs';
import { BasicSourceMapConsumer, Position, RawSourceMap, SourceMapConsumer, SourceMapGenerator } from 'source-map';
import { DebugIdGenerator } from './DebugIdGenerator';
import { stringToUuid } from './helpers/stringToUuid';

export class SourceProcessor {
    constructor(private readonly _debugIdGenerator: DebugIdGenerator) {}

    public async processSourceAndSourceMap(source: string, sourceMap: string | RawSourceMap, debugId?: string) {
        if (!debugId) {
            debugId = stringToUuid(source);
        }

        const sourceSnippet = this._debugIdGenerator.generateSourceSnippet(debugId);
        const sourceComment = this._debugIdGenerator.generateSourceComment(debugId);

        const newSource = sourceSnippet + '\n' + source + '\n' + sourceComment;

        // We need to offset the source map by amount of lines that we're inserting to the source code
        const offsetSourceMap = await this.offsetSourceMap(sourceMap, 0, 1);
        const newSourceMap = this._debugIdGenerator.addSourceMapKey(offsetSourceMap, debugId);

        return { debugId, source: newSource, sourceMap: newSourceMap };
    }

    public async processSourceAndSourceMapFiles(sourcePath: string, sourceMapPath: string, debugId?: string) {
        const source = await fs.promises.readFile(sourcePath, 'utf8');
        const sourceMap = await fs.promises.readFile(sourceMapPath, 'utf8');

        const result = await this.processSourceAndSourceMap(source, sourceMap, debugId);

        await fs.promises.writeFile(sourcePath, result.source, 'utf8');
        await fs.promises.writeFile(sourceMapPath, JSON.stringify(result.sourceMap), 'utf8');

        return result.debugId;
    }

    private async offsetSourceMap(
        sourceMap: string | RawSourceMap,
        fromLine: number,
        count: number,
    ): Promise<RawSourceMap> {
        const consumer = (await new SourceMapConsumer(sourceMap)) as BasicSourceMapConsumer;
        const newSourceMap = new SourceMapGenerator({
            file: consumer.file,
            sourceRoot: consumer.sourceRoot,
        });

        consumer.eachMapping((m) => {
            if (m.generatedLine < fromLine) {
                return;
            }

            newSourceMap.addMapping({
                source: m.source,
                name: m.name,
                generated:
                    m?.generatedColumn != null
                        ? { column: m.generatedColumn, line: m.generatedLine + count }
                        : (null as unknown as Position),
                original:
                    m?.originalColumn != null
                        ? { column: m.originalColumn, line: m.originalLine }
                        : (null as unknown as Position),
            });
        });

        return newSourceMap.toJSON();
    }
}
