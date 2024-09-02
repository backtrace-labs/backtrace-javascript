import {
    BacktraceAttachment,
    BacktraceAttachmentProvider,
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
import { BacktraceFileAttachment } from '../attachment/index.js';
import { AlternatingFileWriter } from '../common/AlternatingFileWriter.js';
import { NodeFileSystem } from '../storage/interfaces/NodeFileSystem.js';

const FILE_PREFIX = 'bt-breadcrumbs';

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
        this._writer = new AlternatingFileWriter(
            _mainFile,
            _fallbackFile,
            Math.floor(maximumBreadcrumbs / 2),
            fileSystem,
        );
    }

    public static getSessionAttachments(session: SessionFiles) {
        const files = session
            .getSessionFiles()
            .filter((f) => path.basename(f).startsWith(FILE_PREFIX))
            .slice(0, 2);

        return files.map((file) => new BacktraceFileAttachment(file, path.basename(file)));
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

    public getAttachmentProviders(): BacktraceAttachmentProvider[] {
        return [
            {
                get: () => new BacktraceFileAttachment(this._mainFile, 'bt-breadcrumbs-0'),
                type: 'dynamic',
            },
            {
                get: () => new BacktraceFileAttachment(this._fallbackFile, 'bt-breadcrumbs-1'),
                type: 'dynamic',
            },
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
