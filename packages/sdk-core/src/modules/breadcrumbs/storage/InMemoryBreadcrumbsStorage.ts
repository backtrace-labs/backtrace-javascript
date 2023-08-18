import { jsonEscaper } from '../../../common/jsonEscaper';
import { TimeHelper } from '../../../common/TimeHelper';
import { OverwritingArray } from '../../../dataStructures/OverwritingArray';
import { Breadcrumb } from '../model/Breadcrumb';
import { BreadcrumbLogLevel } from '../model/BreadcrumbLogLevel';
import { BreadcrumbType } from '../model/BreadcrumbType';
import { RawBreadcrumb } from '../model/RawBreadcrumb';
import { BreadcrumbsStorage } from './BreadcrumbsStorage';

export class InMemoryBreadcrumbsStorage implements BreadcrumbsStorage {
    public get lastBreadcrumbId(): number {
        return this._lastBreadcrumbId;
    }
    /**
     * Breadcrumb name
     */
    public readonly name: string = 'bt-breadcrumbs-0';

    private _lastBreadcrumbId: number = TimeHelper.toTimestampInSec(TimeHelper.now());
    private _breadcrumbs: OverwritingArray<Breadcrumb>;

    constructor(maximumBreadcrumbs = 100) {
        this._breadcrumbs = new OverwritingArray<Breadcrumb>(maximumBreadcrumbs);
    }

    /**
     * Returns breadcrumbs in the JSON format
     * @returns Breadcrumbs JSON
     */
    public get(): string {
        return JSON.stringify([...this._breadcrumbs.values()], jsonEscaper());
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
