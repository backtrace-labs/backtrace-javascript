import { BacktraceBreadcrumbs } from '../BacktraceBreadcrumbs';

export interface BreadcrumbsEventSubscriber {
    /**
     * Set up breadcrumbs listener
     * @param breadcrumbsManager breadcrumbs manager
     */
    start(breadcrumbsManager: BacktraceBreadcrumbs): void;

    /**
     * Dispose all breadcrumbs events
     */
    dispose(): void;
}
