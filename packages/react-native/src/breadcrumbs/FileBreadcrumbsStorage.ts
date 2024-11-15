import {
    BreadcrumbLogLevel,
    BreadcrumbType,
    jsonEscaper,
    SessionFiles,
    TimeHelper,
    type BacktraceAttachment,
    type BacktraceAttachmentProvider,
    type Breadcrumb,
    type BreadcrumbsStorage,
    type RawBreadcrumb,
} from '@backtrace/sdk-core';
import { WritableStream } from 'web-streams-polyfill';
import { BacktraceFileAttachment } from '..';
import { type FileSystem } from '../storage';
import { ChunkifierSink } from '../storage/Chunkifier';
import { FileChunkSink } from '../storage/FileChunkSink';
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
        maximumBreadcrumbs: number,
    ) {
        this._sink = new FileChunkSink({
            maxFiles: 2,
            fs: this._fileSystem,
            file: (n) => session.getFileName(FileBreadcrumbsStorage.getFileName(n)),
        });

        this._destinationStream = new WritableStream(
            new ChunkifierSink({
                sink: this._sink.getSink(),
                splitter: () => lineChunkSplitter(Math.ceil(maximumBreadcrumbs / 2)),
            }),
        );

        this._destinationWriter = this._destinationStream.getWriter();
    }

    public static create(fileSystem: FileSystem, session: SessionFiles, maximumBreadcrumbs: number) {
        return new FileBreadcrumbsStorage(session, fileSystem, maximumBreadcrumbs);
    }

    public getAttachments(): BacktraceAttachment<unknown>[] {
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
        this._destinationWriter.write(breadcrumbJson + '\n');

        return id;
    }

    private static getFileName(index: number) {
        return `${FILE_PREFIX}-${index}`;
    }
}
