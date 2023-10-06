import { BacktraceBreadcrumbs } from '../BacktraceBreadcrumbs';

export interface BreadcrumbsEventSubscriber {
    /**
     * Set up breadcrumbs listener
     * @param backtraceBreadcrumbs breadcrumbs manager
     */
    start(backtraceBreadcrumbs: BacktraceBreadcrumbs): void;

    /**
     * Dispose all breadcrumbs events
     */
    dispose(): void;
}
