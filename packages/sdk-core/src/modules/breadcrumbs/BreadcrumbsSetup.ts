import { BreadcrumbsEventSubscriber } from './events/BreadcrumbsEventSubscriber.js';
import { BreadcrumbsStorage } from './storage/BreadcrumbsStorage.js';

export interface BreadcrumbsSetup {
    storage?: BreadcrumbsStorage;
    subscribers?: BreadcrumbsEventSubscriber[];
}
