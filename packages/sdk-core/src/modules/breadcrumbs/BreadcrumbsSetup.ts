import { BreadcrumbsEventSubscriber } from './events/BreadcrurmbsEventSubscriber';
import { BreadcrumbsStorage } from './storage/BreadcrumbsStorage';

export interface BreadcrumbsSetup {
    storage?: BreadcrumbsStorage;
    subscribers?: BreadcrumbsEventSubscriber[];
}
