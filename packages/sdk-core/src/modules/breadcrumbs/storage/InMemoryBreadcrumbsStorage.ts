import { TimeHelper } from '../../../common/TimeHelper';
import { AttributeType } from '../../../model/data/BacktraceData';
import { Breadcrumb } from '../model/Breadcrumb';
import { BreadcrumbLogLevel } from '../model/BreadcrumbLogLevel';
import { BreadcrumbType } from '../model/BreadcrumbType';
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
    private _breadcrumbs: Breadcrumb[] = [];

    constructor(private readonly _maximumBreadcrumbs: number = 100) {}

    /**
     * Returns breadcrumbs in the JSON format
     * @returns Breadcrumbs JSON
     */
    public get(): string {
        return JSON.stringify(this._breadcrumbs);
    }

    public add(
        message: string,
        level: BreadcrumbLogLevel,
        type: BreadcrumbType,
        attributes?: Record<string, AttributeType> | undefined,
    ): number {
        this._lastBreadcrumbId++;
        const id = this._lastBreadcrumbId;
        const breadcrumb: Breadcrumb = {
            id,
            message,
            timestamp: TimeHelper.toTimestampInSec(TimeHelper.now()),
            type: BreadcrumbType[type].toLowerCase(),
            level: BreadcrumbLogLevel[level].toLowerCase(),
        };

        if (attributes) {
            breadcrumb.attributes = attributes;
        }

        this._breadcrumbs.push(breadcrumb);

        if (this._maximumBreadcrumbs < this._breadcrumbs.length) {
            this._breadcrumbs = this._breadcrumbs.slice(this._breadcrumbs.length - this._maximumBreadcrumbs);
        }

        return id;
    }
}
