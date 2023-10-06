import {
    BacktraceBreadcrumbs,
    BreadcrumbLogLevel,
    BreadcrumbsEventSubscriber,
    BreadcrumbType,
} from '@backtrace-labs/sdk-core';

export class DocumentEventSubscriber implements BreadcrumbsEventSubscriber {
    private readonly _controller: AbortController = new AbortController();

    public start(backtraceBreadcrumbs: BacktraceBreadcrumbs): void {
        const signal = this._controller.signal;
        document.addEventListener(
            'click',
            (mouseEvent: MouseEvent) => {
                const target = mouseEvent.target as Element;
                if (!target) {
                    return;
                }

                backtraceBreadcrumbs.addBreadcrumb(
                    `Clicked ${target.id} ${target.tagName}`,
                    BreadcrumbLogLevel.Info,
                    BreadcrumbType.User,
                    {
                        id: target.id,
                        class: target.className,
                        name: target.tagName,
                        text: (target as { text?: string })?.text,
                    },
                );
            },
            {
                signal,
            },
        );

        document.addEventListener(
            'dblclick',
            (mouseEvent: MouseEvent) => {
                const target = mouseEvent.target as Element;
                if (!target) {
                    return;
                }

                backtraceBreadcrumbs.addBreadcrumb(
                    `Double clicked ${target.id} ${target.tagName}`,
                    BreadcrumbLogLevel.Info,
                    BreadcrumbType.User,
                    {
                        id: target.id,
                        class: target.className,
                        name: target.tagName,
                        text: (target as { text?: string })?.text,
                    },
                );
            },
            {
                signal,
            },
        );

        document.addEventListener(
            'drag',
            (dragEvent: DragEvent) => {
                const target = dragEvent.target as Element;
                if (!target) {
                    return;
                }

                backtraceBreadcrumbs.addBreadcrumb(
                    `An element ${target.id} ${target.tagName} is being dragged`,
                    BreadcrumbLogLevel.Debug,
                    BreadcrumbType.User,
                    {
                        id: target.id,
                        class: target.className,
                        name: target.tagName,
                    },
                );
            },
            {
                signal,
            },
        );

        document.addEventListener(
            'drop',
            (dragEvent: DragEvent) => {
                const target = dragEvent.target as Element;
                if (!target) {
                    return;
                }

                backtraceBreadcrumbs.addBreadcrumb(
                    `A dragged element is dropped on the target	${target.id} ${target.tagName}`,
                    BreadcrumbLogLevel.Debug,
                    BreadcrumbType.User,
                    {
                        id: target.id,
                        class: target.className,
                        name: target.tagName,
                    },
                );
            },
            {
                signal,
            },
        );

        window.addEventListener('load', () => {
            backtraceBreadcrumbs.addBreadcrumb(`The page has loaded`, BreadcrumbLogLevel.Info, BreadcrumbType.System);
        });

        window.addEventListener('unload', () => {
            backtraceBreadcrumbs.addBreadcrumb(
                `The page started unloading`,
                BreadcrumbLogLevel.Info,
                BreadcrumbType.System,
            );
        });

        window.addEventListener('pagehide', () => {
            backtraceBreadcrumbs.addBreadcrumb(
                'User navigates away from a webpage',
                BreadcrumbLogLevel.Info,
                BreadcrumbType.User,
            );
        });

        window.addEventListener('pageshow', () => {
            backtraceBreadcrumbs.addBreadcrumb(
                'User navigates to a webpage',
                BreadcrumbLogLevel.Info,
                BreadcrumbType.User,
            );
        });

        window.addEventListener(
            'online',
            () => {
                backtraceBreadcrumbs.addBreadcrumb(
                    `The browser starts working online`,
                    BreadcrumbLogLevel.Info,
                    BreadcrumbType.System,
                );
            },
            {
                signal,
            },
        );

        window.addEventListener(
            'offline',
            () => {
                backtraceBreadcrumbs.addBreadcrumb(
                    `The browser starts working offline	`,
                    BreadcrumbLogLevel.Warning,
                    BreadcrumbType.System,
                );
            },
            {
                signal,
            },
        );
    }
    public dispose(): void {
        this._controller.abort();
    }
}
