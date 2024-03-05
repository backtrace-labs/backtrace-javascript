import { jsonEscaper } from '../../../common/jsonEscaper';
import { TimeHelper } from '../../../common/TimeHelper';
import { OverwritingArray } from '../../../dataStructures/OverwritingArray';
import { BacktraceAttachment } from '../../../model/attachment';
import { Breadcrumb } from '../model/Breadcrumb';
import { BreadcrumbLogLevel } from '../model/BreadcrumbLogLevel';
import { BreadcrumbType } from '../model/BreadcrumbType';
import { RawBreadcrumb } from '../model/RawBreadcrumb';
import { BreadcrumbsStorage, BreadcrumbsStorageLimits, BreadcrumbsStorageOptions } from './BreadcrumbsStorage';

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

    constructor(private readonly _limits: BreadcrumbsStorageLimits) {
        this._breadcrumbs = new OverwritingArray<Breadcrumb>(_limits.maximumBreadcrumbs ?? 100);
    }

    public getAttachments(): BacktraceAttachment<unknown>[] {
        return [this];
    }

    public static factory({ limits }: BreadcrumbsStorageOptions) {
        return new InMemoryBreadcrumbsStorage(limits);
    }

    /**
     * Returns breadcrumbs in the JSON format
     * @returns Breadcrumbs JSON
     */
    public get(): string {
        const sizeLimit = this._limits.maximumBreadcrumbsSize;
        const breadcrumbs = [...this._breadcrumbs.values()];
        if (sizeLimit === undefined) {
            return JSON.stringify(breadcrumbs, jsonEscaper());
        }

        let breadcrumbsSize = 2;
        const breadcrumbsToSubmit: string[] = [];
        for (let i = breadcrumbs.length - 1; i >= 0; i--) {
            const json = JSON.stringify(breadcrumbs[i], jsonEscaper());
            const length = json.length + (i === 0 ? 0 : 1); // Add the comma if not first element
            if (breadcrumbsSize + length > sizeLimit) {
                break;
            }

            breadcrumbsToSubmit.unshift(json);
            breadcrumbsSize += length;
        }

        return `[${breadcrumbsToSubmit.join(',')}]`;
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

        return id;
    }
}
