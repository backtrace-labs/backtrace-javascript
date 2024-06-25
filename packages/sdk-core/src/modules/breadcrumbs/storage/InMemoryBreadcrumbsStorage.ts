import { jsonEscaper } from '../../../common/jsonEscaper.js';
import { jsonSize } from '../../../common/jsonSize.js';
import { TimeHelper } from '../../../common/TimeHelper.js';
import { OverwritingArray } from '../../../dataStructures/OverwritingArray.js';
import { BacktraceAttachment } from '../../../model/attachment/index.js';
import { BacktraceAttachmentProvider } from '../../attachments/BacktraceAttachmentProvider.js';
import { Breadcrumb } from '../model/Breadcrumb.js';
import { BreadcrumbLogLevel } from '../model/BreadcrumbLogLevel.js';
import { BreadcrumbType } from '../model/BreadcrumbType.js';
import { RawBreadcrumb } from '../model/RawBreadcrumb.js';
import { BreadcrumbsStorage, BreadcrumbsStorageLimits, BreadcrumbsStorageOptions } from './BreadcrumbsStorage.js';

export class InMemoryBreadcrumbsStorage implements BreadcrumbsStorage, BacktraceAttachment {
    public get lastBreadcrumbId(): number {
        return this._lastBreadcrumbId;
    }
    /**
     * Breadcrumb name
     */
    public readonly name: string = 'bt-breadcrumbs-0';

    private _lastBreadcrumbId: number = TimeHelper.toTimestampInSec(TimeHelper.now());
    private _breadcrumbs: OverwritingArray<Breadcrumb>;
    private _breadcrumbSizes: OverwritingArray<number>;

    constructor(private readonly _limits: BreadcrumbsStorageLimits) {
        this._breadcrumbs = new OverwritingArray<Breadcrumb>(_limits.maximumBreadcrumbs ?? 100);
        this._breadcrumbSizes = new OverwritingArray<number>(this._breadcrumbs.capacity);
    }

    public getAttachments(): BacktraceAttachment<unknown>[] {
        return [this];
    }

    public getAttachmentProviders(): BacktraceAttachmentProvider[] {
        return [
            {
                get: () => this,
                type: 'scoped',
            },
        ];
    }

    public static factory({ limits }: BreadcrumbsStorageOptions) {
        return new InMemoryBreadcrumbsStorage(limits);
    }

    /**
     * Returns breadcrumbs in the JSON format
     * @returns Breadcrumbs JSON
     */
    public get(): string {
        return JSON.stringify([...this._breadcrumbs], jsonEscaper());
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
        };

        if (rawBreadcrumb.attributes) {
            breadcrumb.attributes = rawBreadcrumb.attributes;
        }

        this._breadcrumbs.add(breadcrumb);

        if (this._limits.maximumBreadcrumbsSize) {
            const size = jsonSize(breadcrumb, jsonEscaper());
            this._breadcrumbSizes.add(size);

            let totalSize = this.totalSize();
            while (totalSize > this._limits.maximumBreadcrumbsSize) {
                this._breadcrumbs.shift();
                const removedSize = this._breadcrumbSizes.shift() ?? 0;

                // We subtract removedSize plus comma in JSON
                totalSize -= removedSize + 1;
            }
        }

        return id;
    }

    private totalSize() {
        let sum = 0;
        for (const size of this._breadcrumbSizes) {
            sum += size;
        }

        // Sum of:
        // - all breadcrumbs
        // - comma count
        // - brackets
        return sum + Math.max(0, this._breadcrumbSizes.length - 1) + 2;
    }
}
