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
import { BacktraceFileAttachment } from '../attachment/BacktraceFileAttachment';
import { FileSnapshotAttachment } from '../attachment/FileSnapshotAttachment';
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
    private readonly _queuedLines = new Map<number, string>();
    private readonly _firstFile: string;
    private readonly _fileLimits: { maximumLines?: number; maximumLength?: number };

    constructor(
        session: SessionFiles,
        private readonly _fileSystem: FileSystem,
        private readonly _limits: BreadcrumbsStorageLimits,
        onFilesChange?: (lastBreadcrumbId: number) => void,
    ) {
        const file = (n: number) => session.getFileName(FileBreadcrumbsStorage.getFileName(n));
        this._firstFile = file(0);
        this._sink = new FileChunkSink({
            maxFiles: 2,
            fs: this._fileSystem,
            file,
            onFilesChange: onFilesChange && (() => onFilesChange(this._lastBreadcrumbId)),
        });

        const { maximumBreadcrumbs, maximumTotalBreadcrumbsSize } = this._limits;
        const maximumLines = maximumBreadcrumbs !== undefined ? Math.ceil(maximumBreadcrumbs / 2) : undefined;
        const maximumLength =
            maximumTotalBreadcrumbsSize !== undefined ? Math.ceil(maximumTotalBreadcrumbsSize / 2) : undefined;
        this._fileLimits = { maximumLines, maximumLength };

        const splitters: ChunkSplitterFactory<string>[] = [];
        if (maximumLines !== undefined) {
            splitters.push(() => lineChunkSplitter(maximumLines));
        }

        if (maximumLength !== undefined) {
            splitters.push(() => lengthChunkSplitter(maximumLength, 'skip'));
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

    public static factory(
        session: SessionFiles,
        fileSystem: FileSystem,
        onFilesChange?: (lastBreadcrumbId: number) => void,
    ): BreadcrumbsStorageFactory {
        return ({ limits }) => new FileBreadcrumbsStorage(session, fileSystem, limits, onFilesChange);
    }

    public getAttachments(): BacktraceFileAttachment[] {
        const files =
            this._sink.files.length || !this._queuedLines.size
                ? this._sink.files.map((f) => f.path)
                : [this._firstFile];
        return files.map(
            (f, i) =>
                new FileSnapshotAttachment(this._fileSystem, f, `bt-breadcrumbs-${i}`, 'application/json', {
                    ...this._fileLimits,
                    queuedLines: () => (this.newestFile() === f ? [...this._queuedLines.values()] : []),
                }),
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

        const line = JSON.stringify(breadcrumb, jsonEscaper()) + '\n';
        const { maximumLength } = this._fileLimits;
        if (maximumLength === undefined || line.length <= maximumLength) {
            this._queuedLines.set(id, line);
        }
        this._destinationWriter
            .write(line)
            .catch(() => {
                // Fail silently here, there's not much we can do about this
            })
            .finally(() => this._queuedLines.delete(id));

        return id;
    }

    private newestFile() {
        return this._sink.files[this._sink.files.length - 1]?.path ?? this._firstFile;
    }

    private static getFileName(index: number) {
        return `${FILE_PREFIX}-${index}`;
    }
}
