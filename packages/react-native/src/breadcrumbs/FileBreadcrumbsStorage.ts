import {
    BreadcrumbLogLevel,
    BreadcrumbType,
    SessionFiles,
    TimeHelper,
    jsonEscaper,
    type BacktraceAttachment,
    type Breadcrumb,
    type BreadcrumbsStorage,
    type BreadcrumbsStorageFactory,
    type BreadcrumbsStorageLimits,
    type RawBreadcrumb,
} from '@backtrace/sdk-core';
import { BacktraceFileAttachment } from '..';
import { type FileSystem } from '../storage';
import type { FileLocation } from '../types/FileLocation';
import { AlternatingFileWriter } from './AlternatingFileWriter';

const FILE_PREFIX = 'bt-breadcrumbs';

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
        private readonly _limits: BreadcrumbsStorageLimits,
    ) {
        this._writer = new AlternatingFileWriter(
            _fileSystem,
            _mainFile,
            _fallbackFile,
            Math.floor((this._limits.maximumBreadcrumbs ?? 100) / 2),
            this._limits.maximumTotalBreadcrumbsSize,
        );
    }

    public static factory(fileSystem: FileSystem, session: SessionFiles): BreadcrumbsStorageFactory {
        return ({ limits }) => {
            const file1 = session.getFileName(this.getFileName(0));
            const file2 = session.getFileName(this.getFileName(1));
            return new FileBreadcrumbsStorage(fileSystem, file1, file2, limits);
        };
    }

    public getAttachments(): [BacktraceAttachment<FileLocation>, BacktraceAttachment<FileLocation>] {
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
        const jsonLength = breadcrumbJson.length + 1; // newline
        const sizeLimit = this._limits.maximumTotalBreadcrumbsSize;
        if (sizeLimit !== undefined) {
            if (jsonLength > sizeLimit) {
                return id;
            }
        }

        this._writer.writeLine(breadcrumbJson);

        return id;
    }

    private static getFileName(index: number) {
        return `${FILE_PREFIX}-${index}`;
    }
}
