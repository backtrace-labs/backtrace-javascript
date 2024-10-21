import {
    BacktraceAttachment,
    BacktraceAttachmentProvider,
    Breadcrumb,
    BreadcrumbLogLevel,
    BreadcrumbsStorage,
    BreadcrumbsStorageFactory,
    BreadcrumbsStorageLimits,
    BreadcrumbType,
    jsonEscaper,
    RawBreadcrumb,
    SessionFiles,
    TimeHelper,
} from '@backtrace/sdk-core';
import path from 'path';
import { Readable, Writable } from 'stream';
import { BacktraceFileAttachment } from '../attachment/index.js';
import { NodeFileSystem } from '../storage/interfaces/NodeFileSystem.js';
import { chunkifier, ChunkSplitterFactory } from '../streams/chunkifier.js';
import { combinedChunkSplitter } from '../streams/combinedChunkSplitter.js';
import { FileChunkSink } from '../streams/fileChunkSink.js';
import { lengthChunkSplitter } from '../streams/lengthChunkSplitter.js';
import { lineChunkSplitter } from '../streams/lineChunkSplitter.js';

const FILE_PREFIX = 'bt-breadcrumbs';

export class FileBreadcrumbsStorage implements BreadcrumbsStorage {
    public get lastBreadcrumbId(): number {
        return this._lastBreadcrumbId;
    }

    private _lastBreadcrumbId: number = TimeHelper.toTimestampInSec(TimeHelper.now());

    private readonly _dest: Writable;
    private readonly _sink: FileChunkSink;

    constructor(
        session: SessionFiles,
        private readonly _fileSystem: NodeFileSystem,
        private readonly _limits: BreadcrumbsStorageLimits,
    ) {
        const splitters: ChunkSplitterFactory[] = [];
        const maximumBreadcrumbs = this._limits.maximumBreadcrumbs;
        if (maximumBreadcrumbs !== undefined) {
            splitters.push(() => lineChunkSplitter(Math.ceil(maximumBreadcrumbs / 2)));
        }

        const maximumTotalBreadcrumbsSize = this._limits.maximumTotalBreadcrumbsSize;
        if (maximumTotalBreadcrumbsSize !== undefined) {
            splitters.push(() => lengthChunkSplitter(Math.ceil(maximumTotalBreadcrumbsSize), 'skip'));
        }

        this._sink = new FileChunkSink({
            maxFiles: 2,
            fs: this._fileSystem,
            file: (n) => session.getFileName(FileBreadcrumbsStorage.getFileName(n)),
        });

        if (!splitters.length) {
            this._dest = this._sink.getSink()(0);
        } else {
            this._dest = chunkifier({
                sink: this._sink.getSink(),
                splitter:
                    splitters.length === 1 ? splitters[0] : () => combinedChunkSplitter(...splitters.map((s) => s())),
            });
        }

        this._dest.on('error', () => {
            // Do nothing on error
        });
    }

    public static getSessionAttachments(session: SessionFiles, fileSystem?: NodeFileSystem) {
        const files = session
            .getSessionFiles()
            .filter((f) => path.basename(f).startsWith(FILE_PREFIX))
            .slice(0, 2);

        return files.map((file) => new BacktraceFileAttachment(file, path.basename(file), fileSystem));
    }

    public static factory(session: SessionFiles, fileSystem: NodeFileSystem): BreadcrumbsStorageFactory {
        return ({ limits }) => new FileBreadcrumbsStorage(session, fileSystem, limits);
    }

    public getAttachments(): BacktraceAttachment<Readable>[] {
        const files = [...this._sink.files].map((f) => f.path.toString('utf-8'));
        return files.map((f) => new BacktraceFileAttachment(f, f, this._fileSystem));
    }

    public getAttachmentProviders(): BacktraceAttachmentProvider[] {
        return [
            {
                get: () => {
                    const files = [...this._sink.files].map((f) => f.path.toString('utf-8'));
                    return files.map((f) => new BacktraceFileAttachment(f, path.basename(f), this._fileSystem));
                },
                type: 'dynamic',
            },
        ];
    }

    public add(rawBreadcrumb: RawBreadcrumb) {
        this._lastBreadcrumbId++;
        const id = this._lastBreadcrumbId;
        const breadcrumb: Breadcrumb = {
            id,
            message: rawBreadcrumb.message,
            timestamp: TimeHelper.now(),
            type: BreadcrumbType[rawBreadcrumb.type].toLowerCase(),
            level: BreadcrumbLogLevel[rawBreadcrumb.level].toLowerCase(),
            attributes: rawBreadcrumb.attributes,
        };

        const breadcrumbJson = JSON.stringify(breadcrumb, jsonEscaper());
        const jsonLength = breadcrumbJson.length + 1; // newline
        const sizeLimit = this._limits.maximumTotalBreadcrumbsSize;
        if (sizeLimit !== undefined) {
            if (jsonLength > sizeLimit) {
                return undefined;
            }
        }

        this._dest.write(breadcrumbJson + '\n');
        return id;
    }

    private static getFileName(index: number) {
        return `${FILE_PREFIX}-${index}`;
    }
}
