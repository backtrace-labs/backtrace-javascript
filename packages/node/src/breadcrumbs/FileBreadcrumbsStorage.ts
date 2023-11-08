import {
    BacktraceAttachment,
    Breadcrumb,
    BreadcrumbLogLevel,
    BreadcrumbsStorage,
    BreadcrumbType,
    jsonEscaper,
    RawBreadcrumb,
    SessionFiles,
    TimeHelper,
} from '@backtrace/sdk-core';
import path from 'path';
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
        fileSystem: NodeFileSystem,
        maximumBreadcrumbs: number,
    ) {
        this._writer = new AlternatingFileWriter(_mainFile, _fallbackFile, maximumBreadcrumbs, fileSystem);
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

        return new FileBreadcrumbsStorage(files[0], files[1], fileSystem, 1);
    }

    public static create(session: SessionFiles, fileSystem: NodeFileSystem, maximumBreadcrumbs: number) {
        const file1 = session.getFileName(this.getFileName(0));
        const file2 = session.getFileName(this.getFileName(1));
        return new FileBreadcrumbsStorage(file1, file2, fileSystem, maximumBreadcrumbs);
    }

    public getAttachments(): BacktraceAttachment<unknown>[] {
        return [
            new BacktraceFileAttachment(this._mainFile, 'bt-breadcrumbs-0'),
            new BacktraceFileAttachment(this._fallbackFile, 'bt-breadcrumbs-1'),
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
        this._writer.writeLine(breadcrumbJson);

        return id;
    }

    private static getFileName(index: number) {
        return `${FILE_PREFIX}-${index}`;
    }
}
