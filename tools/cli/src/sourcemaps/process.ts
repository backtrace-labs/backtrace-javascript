import {
    AsyncResult,
    DebugIdGenerator,
    Err,
    ProcessResultWithPaths,
    Result,
    SourceProcessor,
    flatMap,
} from '@backtrace/sourcemap-tools';
import { GlobalOptions } from '..';
import { Command } from '../commands/Command';
import { failIfEmpty, passOk, writeFile } from '../helpers/common';
import { find } from '../helpers/find';
import { CliLogger, createLogger } from '../logger';

interface ProcessOptions extends GlobalOptions {
    readonly path: string[];
    readonly 'dry-run': boolean;
    readonly force: boolean;
    readonly 'pass-with-no-files': boolean;
}

export const processCmd = new Command<ProcessOptions>({
    name: 'process',
    description: 'Processing source and sourcemap files',
})
    .option({
        name: 'path',
        description: 'Path to sourcemap files or directories containing sourcemaps to upload.',
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
        description: 'Processes files even if already processed.',
        defaultValue: false,
    })
    .option({
        name: 'pass-with-no-files',
        type: Boolean,
        description: 'Exits with zero exit code if no files for processing are found.',
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

        return AsyncResult.equip(find(/\.(c|m)?jsx?$/, ...searchPaths))
            .then(opts.force ? passOk : filterUnprocessedFiles(sourceProcessor))
            .then(opts['pass-with-no-files'] ? passOk : failIfEmpty('no files for processing found'))
            .then(processFiles(sourceProcessor))
            .then(opts['dry-run'] ? passOk : writeResults)
            .then(output(logger))
            .then(() => 0).inner;
    });

function filterUnprocessedFiles(sourceProcessor: SourceProcessor) {
    return async function filterUnprocessedFiles(files: string[]): Promise<Result<string[], string>> {
        return flatMap(
            await Promise.all(
                files.map(
                    (file) =>
                        AsyncResult.equip(sourceProcessor.isSourceFileProcessed(file)).then(
                            (result) => [file, result] as const,
                        ).inner,
                ),
            ),
        ).map((results) => results.filter(([, result]) => !result).map(([file]) => file));
    };
}

function processFiles(sourceProcessor: SourceProcessor) {
    return async function processFiles(pathsToProcess: string[]) {
        return flatMap(
            await Promise.all(pathsToProcess.map((file) => sourceProcessor.processSourceAndSourceMapFiles(file))),
        );
    };
}

async function writeResults(results: ProcessResultWithPaths[]) {
    return flatMap(await Promise.all(results.map(writeResult)));
}

function writeResult(result: ProcessResultWithPaths) {
    return AsyncResult.equip(writeFile([result.source, result.sourcePath]))
        .then(() => writeFile([JSON.stringify(result.sourceMap), result.sourceMapPath]))
        .then(() => result).inner;
}

function output(logger: CliLogger) {
    return function output(files: ProcessResultWithPaths[]) {
        for (const { sourcePath } of files) {
            logger.output(sourcePath);
        }

        return files;
    };
}
