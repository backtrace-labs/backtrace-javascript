import {
    AsyncResult,
    ContentFile,
    DebugIdGenerator,
    Err,
    SourceProcessor,
    failIfEmpty,
    flatMap,
    map,
    parseJSON,
    pass,
    passOk,
    readFile,
    writeFile,
} from '@backtrace/sourcemap-tools';
import { GlobalOptions } from '..';
import { Command } from '../commands/Command';
import { find } from '../helpers/find';
import { CliLogger, createLogger } from '../logger';

interface AddSourcesOptions extends GlobalOptions {
    readonly path: string[];
    readonly 'dry-run': boolean;
    readonly force: boolean;
    readonly skipFailing: boolean;
    readonly 'pass-with-no-files': boolean;
}

type ObjectFile = readonly [object, string];

export const addSourcesCmd = new Command<AddSourcesOptions>({
    name: 'add-sources',
    description: 'Adds sources to sourcemap files',
})
    .option({
        name: 'path',
        description: 'Path to sourcemap files to append sources to.',
        defaultOption: true,
        defaultValue: process.cwd(),
        multiple: true,
        alias: 'p',
    })
    .option({
        name: 'dry-run',
        alias: 'n',
        type: Boolean,
        description: 'Does not modify the files at the end.',
        defaultValue: false,
    })
    .option({
        name: 'force',
        alias: 'f',
        type: Boolean,
        description: 'Processes files even if sourcesContent is not empty. Will overwrite existing sources.',
        defaultValue: false,
    })
    .option({
        name: 'pass-with-no-files',
        type: Boolean,
        description: 'Exits with zero exit code if no sourcemaps are found.',
    })
    .execute(function (opts, stack) {
        const logger = createLogger(opts);
        const sourceProcessor = new SourceProcessor(new DebugIdGenerator());
        logger.trace(`resolved options: \n${JSON.stringify(opts, null, '  ')}`);

        const searchPaths = opts.path;
        if (!searchPaths) {
            logger.info(this.getHelpMessage(stack));
            return Err('path must be specified');
        }

        return AsyncResult.equip(find(/\.(c|m)?jsx?\.map$/, ...searchPaths))
            .then(readFiles)
            .then(loadFiles)
            .then(opts.force ? pass : filterFiles(sourceProcessor))
            .then(opts['pass-with-no-files'] ? passOk : failIfEmpty('no valid sourcemaps found'))
            .then(map(addSource(sourceProcessor)))
            .then(opts['dry-run'] ? passOk : writeSourceMaps)
            .then(output(logger))
            .then(() => 0).inner;
    });

async function readFiles(paths: string[]) {
    return Promise.all(
        paths.map((f) => AsyncResult.equip(readFile(f)).then((content) => [content, f] as ContentFile).inner),
    );
}

function loadFiles(files: ContentFile[]) {
    return files.map(([content, path]) => parseJSON<object>(content).map((c) => [c, path] as ObjectFile));
}

function filterFiles(sourceProcessor: SourceProcessor) {
    return function filterFiles(files: ObjectFile[]) {
        return files.filter(filterSourceMapWithoutSource(sourceProcessor));
    };
}

function filterSourceMapWithoutSource(sourceProcessor: SourceProcessor) {
    return function filterSourceMapWithoutSource(sourceMap: ObjectFile): boolean {
        return !sourceProcessor.doesSourceMapHaveSources(sourceMap[0] as never);
    };
}

function addSource(sourceProcessor: SourceProcessor) {
    return function addSource([sourceMapObj, sourceMapPath]: ObjectFile) {
        return AsyncResult.equip(sourceProcessor.addSourcesToSourceMap(sourceMapObj as never, sourceMapPath)).then(
            (newSourceMap) => [newSourceMap, sourceMapPath] as const,
        ).inner;
    };
}

async function writeSourceMaps(file: ObjectFile[]) {
    return flatMap(await Promise.all(file.map(writeSourceMap)));
}

function writeSourceMap(file: ObjectFile) {
    const [sourceMapObj, sourceMapPath] = file;
    return AsyncResult.equip(writeFile([JSON.stringify(sourceMapObj), sourceMapPath])).then(() => file).inner;
}

function output(logger: CliLogger) {
    return function output(files: ObjectFile[]) {
        for (const [, file] of files) {
            logger.output(file);
        }

        return files;
    };
}
