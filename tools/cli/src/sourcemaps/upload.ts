import {
    AsyncResult,
    DebugIdGenerator,
    Err,
    Ok,
    Result,
    ResultPromise,
    SourceProcessor,
    SymbolUploader,
    UploadResult,
    ZipArchive,
    flatMap,
} from '@backtrace/sourcemap-tools';
import path from 'path';
import { Readable } from 'stream';
import { GlobalOptions } from '..';
import { Command } from '../commands/Command';
import { failIfEmpty, passOk } from '../helpers/common';
import { find } from '../helpers/find';
import { CliLogger, createLogger } from '../logger';

interface UploadOptions extends GlobalOptions {
    readonly url: string;
    readonly path: string[];
    readonly 'no-sources': string;
    readonly insecure: boolean;
    readonly 'dry-run': boolean;
    readonly force: boolean;
    readonly 'pass-with-no-files': boolean;
}

export const uploadCmd = new Command<UploadOptions>({
    name: 'upload',
    description: 'Uploading of sourcemaps to Backtrace',
})
    .option({
        name: 'url',
        type: String,
        description: 'URL to upload to. You can use also BACKTRACE_JS_UPLOAD_URL env variable.',
        alias: 'u',
        defaultValue: process.env.BACKTRACE_JS_UPLOAD_URL,
    })
    .option({
        name: 'path',
        type: String,
        description: 'Path to sourcemap files or directories containing sourcemaps to upload.',
        defaultOption: true,
        defaultValue: process.cwd(),
        multiple: true,
        alias: 'p',
    })
    .option({
        name: 'no-sources',
        type: Boolean,
        description: 'Uploads the sourcemaps without "sourcesContent" key.',
        defaultValue: false,
    })
    .option({
        name: 'insecure',
        alias: 'k',
        type: Boolean,
        description: 'Disables HTTPS certificate checking.',
        defaultValue: false,
    })
    .option({
        name: 'dry-run',
        alias: 'n',
        type: Boolean,
        description: 'Does not upload the files at the end.',
        defaultValue: false,
    })
    .option({
        name: 'force',
        alias: 'f',
        type: Boolean,
        description: 'Upload files even if not processed.',
        defaultValue: false,
    })
    .option({
        name: 'pass-with-no-files',
        type: Boolean,
        description: 'Exits with zero exit code if no files for uploading are found.',
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

        const uploadUrl = opts.url;
        if (!uploadUrl) {
            logger.info(this.getHelpMessage(stack));
            return Err('upload URL is required.');
        }

        const uploader = new SymbolUploader(uploadUrl, { ignoreSsl: opts.insecure ?? false });

        return AsyncResult.equip(find(/\.(c|m)?jsx?\.map$/, ...searchPaths))
            .then(opts.force ? passOk : filterProcessedFiles(sourceProcessor))
            .then(opts['pass-with-no-files'] ? passOk : failIfEmpty('no files for uploading found'))
            .then(createArchiveForUpload)
            .then((archive) => (opts['dry-run'] ? Ok(null) : uploadArchive(uploader)(archive)))
            .then(output(logger))
            .then(() => 0).inner;
    });

function filterProcessedFiles(sourceProcessor: SourceProcessor) {
    return async function filterProcessedFiles(files: string[]): Promise<Result<string[], string>> {
        return flatMap(
            await Promise.all(
                files.map(
                    (file) =>
                        AsyncResult.equip(sourceProcessor.isSourceMapFileProcessed(file)).then(
                            (result) => [file, result] as const,
                        ).inner,
                ),
            ),
        ).map((results) => results.filter(([, result]) => result).map(([file]) => file));
    };
}

async function createArchiveForUpload(pathsToArchive: string[]): ResultPromise<ZipArchive, string> {
    const archive = new ZipArchive();

    for (const filePath of pathsToArchive) {
        const fileName = path.basename(filePath);
        archive.append(fileName, filePath);
    }

    await archive.finalize();
    return Ok(archive);
}

function uploadArchive(symbolUploader: SymbolUploader) {
    return async function uploadArchive(stream: Readable): ResultPromise<UploadResult, string> {
        return await symbolUploader.uploadSymbol(stream);
    };
}

function output(logger: CliLogger) {
    return function output(result: UploadResult | null) {
        logger.output(result?.rxid ?? '<dry run>');
        return result;
    };
}
