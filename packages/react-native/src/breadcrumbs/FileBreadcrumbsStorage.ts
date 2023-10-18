import {
    BreadcrumbLogLevel,
    BreadcrumbType,
    jsonEscaper,
    SessionFiles,
    TimeHelper,
    type BacktraceAttachment,
    type Breadcrumb,
    type BreadcrumbsStorage,
    type RawBreadcrumb,
} from '@backtrace-labs/sdk-core';
import { BacktraceFileAttachment } from '../attachment/BacktraceFileAttachment';
import { type FileSystem } from '../storage';
import { AlternatingFileWriter } from './AlternatingFileWriter';

const FILE_PREFIX = 'breadcrumbs';

export class FileBreadcrumbsStorage implements BreadcrumbsStorage {
    public get lastBreadcrumbId(): number {
        return this._lastBreadcrumbId;
    }

    private _lastBreadcrumbId: number = TimeHelper.toTimestampInSec(TimeHelper.now());
    private readonly _writer: AlternatingFileWriter;

    constructor(
        private readonly _fileSystem: FileSystem,
        private readonly _mainFile: string,
        private readonly _fallbackFile: string,
        maximumBreadcrumbs: number,
    ) {
        this._writer = new AlternatingFileWriter(
            _mainFile,
            _fallbackFile,
            Math.floor(maximumBreadcrumbs / 2),
            _fileSystem,
        );
    }

    public static create(fileSystem: FileSystem, session: SessionFiles, maximumBreadcrumbs: number) {
        const file1 = session.getFileName(this.getFileName(0));
        const file2 = session.getFileName(this.getFileName(1));
        return new FileBreadcrumbsStorage(fileSystem, file1, file2, maximumBreadcrumbs);
    }

    public getAttachments(): BacktraceAttachment<unknown>[] {
        return [
            new BacktraceFileAttachment(this._fileSystem, this._mainFile, 'bt-breadcrumbs-0'),
            new BacktraceFileAttachment(this._fileSystem, this._fallbackFile, 'bt-breadcrumbs-1'),
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
        this._writer.writeLine(breadcrumbJson);

        return id;
    }

    private static getFileName(index: number) {
        return `bt-${FILE_PREFIX}-${index}`;
    }
}
