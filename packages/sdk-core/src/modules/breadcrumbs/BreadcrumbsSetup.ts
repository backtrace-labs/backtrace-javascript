import { BreadcrumbsEventSubscriber } from './events/BreadcrumbsEventSubscriber';
import { BreadcrumbsStorageFactory } from './storage/BreadcrumbsStorage';

export interface BreadcrumbsSetup {
    storage?: BreadcrumbsStorageFactory;
    subscribers?: BreadcrumbsEventSubscriber[];
}
