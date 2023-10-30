import { BreadcrumbsEventSubscriber } from './events/BreadcrumbsEventSubscriber';
import { BreadcrumbsStorage } from './storage/BreadcrumbsStorage';

export interface BreadcrumbsSetup {
    storage?: BreadcrumbsStorage;
    subscribers?: BreadcrumbsEventSubscriber[];
}
