import { BreadcrumbsEventSubscriber } from './events/BreadcrumbsEventSubscriber.js';
import { BreadcrumbsStorageFactory } from './storage/BreadcrumbsStorage.js';

export interface BreadcrumbsSetup {
    storage?: BreadcrumbsStorageFactory;
    subscribers?: BreadcrumbsEventSubscriber[];
}
