import {
    BacktraceBreadcrumbs,
    BreadcrumbLogLevel,
    BreadcrumbsEventSubscriber,
    BreadcrumbType,
} from '@backtrace-labs/sdk-core';

export class HistoryEventSubscriber implements BreadcrumbsEventSubscriber {
    private _abortController = new AbortController();
    private _originalHistoryPushStateMethod?: typeof history.pushState;
    public start(backtraceBreadcrumbs: BacktraceBreadcrumbs): void {
        if ((backtraceBreadcrumbs.breadcrumbsType & BreadcrumbType.Navigation) !== BreadcrumbType.Navigation) {
            return;
        }
        window.addEventListener(
            'popstate',
            (event: PopStateEvent) => {
                backtraceBreadcrumbs.addBreadcrumb(
                    `Navigating back to ${document.location}`,
                    BreadcrumbLogLevel.Info,
                    BreadcrumbType.Navigation,
                    {
                        location: document.location.toString(),
                        state: event.state,
                    },
                );
            },
            {
                signal: this._abortController.signal,
            },
        );

        const originalHistoryPushStateMethod = history.pushState;
        history.pushState = (...args) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const [data, _, url] = args;
            originalHistoryPushStateMethod.apply(history, args);
            backtraceBreadcrumbs.addBreadcrumb(
                `Navigating to ${document.location}`,
                BreadcrumbLogLevel.Info,
                BreadcrumbType.Navigation,
                {
                    url: url?.toString(),
                    data,
                    location: document.location.toString(),
                },
            );
        };
        this._originalHistoryPushStateMethod = originalHistoryPushStateMethod;
    }

    public dispose(): void {
        this._abortController.abort();
        if (this._originalHistoryPushStateMethod) {
            history.pushState = this._originalHistoryPushStateMethod;
        }
    }
}
