import {
    BreadcrumbLogLevel,
    BreadcrumbType,
    jsonEscaper,
    SessionFiles,
    TimeHelper,
    type BacktraceAttachmentProvider,
    type Breadcrumb,
    type BreadcrumbsStorage,
    type BreadcrumbsStorageFactory,
    type BreadcrumbsStorageLimits,
    type RawBreadcrumb,
} from '@backtrace/sdk-core';
import { WritableStream } from 'web-streams-polyfill';
import { BacktraceFileAttachment } from '..';
import { type FileSystem } from '../storage';
import { ChunkifierSink, type ChunkSplitterFactory } from '../storage/Chunkifier';
import { combinedChunkSplitter } from '../storage/combinedChunkSplitter';
import { FileChunkSink } from '../storage/FileChunkSink';
import { lengthChunkSplitter } from '../storage/lengthChunkSplitter';
import { lineChunkSplitter } from '../storage/lineChunkSplitter';

const FILE_PREFIX = 'bt-breadcrumbs';

export class FileBreadcrumbsStorage implements BreadcrumbsStorage {
    public get lastBreadcrumbId(): number {
        return this._lastBreadcrumbId;
    }

    private _lastBreadcrumbId: number = TimeHelper.toTimestampInSec(TimeHelper.now());
    private readonly _destinationStream: WritableStream;
    private readonly _destinationWriter: WritableStreamDefaultWriter;
    private readonly _sink: FileChunkSink;

    constructor(
        session: SessionFiles,
        private readonly _fileSystem: FileSystem,
        private readonly _limits: BreadcrumbsStorageLimits,
    ) {
        this._sink = new FileChunkSink({
            maxFiles: 2,
            fs: this._fileSystem,
            file: (n) => session.getFileName(FileBreadcrumbsStorage.getFileName(n)),
        });

        const splitters: ChunkSplitterFactory<string>[] = [];
        const maximumBreadcrumbs = this._limits.maximumBreadcrumbs;
        if (maximumBreadcrumbs !== undefined) {
            splitters.push(() => lineChunkSplitter(Math.ceil(maximumBreadcrumbs / 2)));
        }

        const maximumTotalBreadcrumbsSize = this._limits.maximumTotalBreadcrumbsSize;
        if (maximumTotalBreadcrumbsSize !== undefined) {
            splitters.push(() => lengthChunkSplitter(Math.ceil(maximumTotalBreadcrumbsSize / 2), 'skip'));
        }

        if (!splitters[0]) {
            this._destinationStream = this._sink.getSink()(0);
        } else {
            this._destinationStream = new WritableStream(
                new ChunkifierSink({
                    sink: this._sink.getSink(),
                    splitter:
                        splitters.length === 1
                            ? splitters[0]
                            : () =>
                                  combinedChunkSplitter<string>((strs) => strs.join(''), ...splitters.map((s) => s())),
                }),
            );
        }

        this._destinationWriter = this._destinationStream.getWriter();
    }

    public static factory(session: SessionFiles, fileSystem: FileSystem): BreadcrumbsStorageFactory {
        return ({ limits }) => new FileBreadcrumbsStorage(session, fileSystem, limits);
    }

    public getAttachments(): BacktraceFileAttachment[] {
        const files = [...this._sink.files].map((f) => f.path);
        return files.map(
            (f, i) => new BacktraceFileAttachment(this._fileSystem, f, `bt-breadcrumbs-${i}`, 'application/json'),
        );
    }

    public getAttachmentProviders(): BacktraceAttachmentProvider[] {
        return [
            {
                get: () => this.getAttachments(),
                type: 'dynamic',
            },
        ];
    }

    public add(rawBreadcrumb: RawBreadcrumb): number {
        const breadcrumbType = BreadcrumbType[rawBreadcrumb.type];
        if (!breadcrumbType) {
            throw new Error(`Unrecognized breadcrumb type. Received: ${rawBreadcrumb.type}`);
        }

        const breadcrumbLevel = BreadcrumbLogLevel[rawBreadcrumb.level];
        if (!breadcrumbLevel) {
            throw new Error(`Unrecognized breadcrumb level. Received: ${rawBreadcrumb.level}`);
        }

        this._lastBreadcrumbId++;
        const id = this._lastBreadcrumbId;
        const breadcrumb: Breadcrumb = {
            id,
            message: rawBreadcrumb.message,
            timestamp: TimeHelper.now(),
            type: breadcrumbType.toLowerCase(),
            level: breadcrumbLevel.toLowerCase(),
            attributes: rawBreadcrumb.attributes,
        };

        const breadcrumbJson = JSON.stringify(breadcrumb, jsonEscaper());
        this._destinationWriter.write(breadcrumbJson + '\n').catch(() => {
            // Fail silently here, there's not much we can do about this
        });

        return id;
    }

    private static getFileName(index: number) {
        return `${FILE_PREFIX}-${index}`;
    }
}
