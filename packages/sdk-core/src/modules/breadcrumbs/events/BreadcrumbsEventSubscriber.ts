import { BacktraceBreadcrumbs } from '../BacktraceBreadcrumbs.js';

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
