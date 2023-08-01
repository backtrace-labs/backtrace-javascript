import { BreadcrumbManager } from '../BreadcrumbManager';

export interface BreadcrumbsEventSubscriber {
    /**
     * Set up breadcrumbs listener
     * @param breadcrumbsManager breadcrumbs manager
     */
    start(breadcrumbsManager: BreadcrumbManager): void;

    /**
     * Dispose all breadcrumbs events
     */
    dispose(): void;
}
