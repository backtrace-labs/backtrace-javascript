import { BreadcrumbsEventSubscriber } from './events/BreadcrurmbsEventSubscriber';
import { BreadcrumbStorage } from './storage/BreadcrumbStorage';

export interface BreadcrumbSetup {
    storage?: BreadcrumbStorage;
    subscribers?: BreadcrumbsEventSubscriber[];
}
