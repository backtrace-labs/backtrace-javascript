import {
    BacktraceAttachment,
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
import { Readable } from 'stream';
import { BacktraceFileAttachment } from '../attachment';
import { AlternatingFileWriter } from '../common/AlternatingFileWriter';
import { NodeFileSystem } from '../storage/interfaces/NodeFileSystem';

const FILE_PREFIX = 'breadcrumbs';

export class FileBreadcrumbsStorage implements BreadcrumbsStorage {
    public get lastBreadcrumbId(): number {
        return this._lastBreadcrumbId;
    }

    private _lastBreadcrumbId: number = TimeHelper.toTimestampInSec(TimeHelper.now());

    private readonly _writer: AlternatingFileWriter;

    constructor(
        private readonly _mainFile: string,
        private readonly _fallbackFile: string,
        private readonly _fileSystem: NodeFileSystem,
        private readonly _limits: BreadcrumbsStorageLimits,
    ) {
        this._writer = new AlternatingFileWriter(
            _fileSystem,
            _mainFile,
            _fallbackFile,
            this._limits.maximumBreadcrumbs ? Math.floor(this._limits.maximumBreadcrumbs / 2) : undefined,
            this._limits.maximumBreadcrumbsSize,
        );
    }

    public static createFromSession(
        session: SessionFiles,
        fileSystem: NodeFileSystem,
    ): FileBreadcrumbsStorage | undefined {
        const files = session
            .getSessionFiles()
            .filter((f) => path.basename(f).startsWith(FILE_PREFIX))
            .slice(0, 2);

        if (!files.length) {
            return undefined;
        }

        return new FileBreadcrumbsStorage(files[0], files[1], fileSystem, {
            maximumBreadcrumbs: 0,
            maximumBreadcrumbsSize: 0,
        });
    }

    public static factory(session: SessionFiles, fileSystem: NodeFileSystem): BreadcrumbsStorageFactory {
        return ({ limits }) => {
            const file1 = session.getFileName(this.getFileName(0));
            const file2 = session.getFileName(this.getFileName(1));
            return new FileBreadcrumbsStorage(file1, file2, fileSystem, limits);
        };
    }

    public getAttachments(): [BacktraceAttachment<Readable>, BacktraceAttachment<Readable>] {
        return [
            new BacktraceFileAttachment(this._mainFile, 'bt-breadcrumbs-0', this._fileSystem),
            new BacktraceFileAttachment(this._fallbackFile, 'bt-breadcrumbs-1', this._fileSystem),
        ];
    }

    public add(rawBreadcrumb: RawBreadcrumb): number {
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
        const sizeLimit = this._limits.maximumBreadcrumbsSize;
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
