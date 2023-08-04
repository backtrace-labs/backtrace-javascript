import { BreadcrumbsManager } from '../BreadcrumbsManager';

export interface BreadcrumbsEventSubscriber {
    /**
     * Set up breadcrumbs listener
     * @param breadcrumbsManager breadcrumbs manager
     */
    start(breadcrumbsManager: BreadcrumbsManager): void;

    /**
     * Dispose all breadcrumbs events
     */
    dispose(): void;
}
