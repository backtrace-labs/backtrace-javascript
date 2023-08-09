import {
    BreadcrumbLogLevel,
    BreadcrumbsEventSubscriber,
    BreadcrumbsManager,
    BreadcrumbType,
} from '@backtrace/sdk-core';

export class DocumentEventSubscriber implements BreadcrumbsEventSubscriber {
    private readonly _controller: AbortController = new AbortController();

    public start(breadcrumbsManager: BreadcrumbsManager): void {
        const signal = this._controller.signal;
        document.addEventListener(
            'click',
            (mouseEvent: MouseEvent) => {
                const target = mouseEvent.target as Element;
                if (!target) {
                    return;
                }

                breadcrumbsManager.addBreadcrumb(
                    `Clicked ${target.id} ${target.tagName}`,
                    BreadcrumbLogLevel.Info,
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
            'dblclick',
            (mouseEvent: MouseEvent) => {
                const target = mouseEvent.target as Element;
                if (!target) {
                    return;
                }

                breadcrumbsManager.addBreadcrumb(
                    `Double clicked ${target.id} ${target.tagName}`,
                    BreadcrumbLogLevel.Info,
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
            'drag',
            (dragEvent: DragEvent) => {
                const target = dragEvent.target as Element;
                if (!target) {
                    return;
                }

                breadcrumbsManager.addBreadcrumb(
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

                breadcrumbsManager.addBreadcrumb(
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
            breadcrumbsManager.addBreadcrumb(`The page has loaded`, BreadcrumbLogLevel.Info, BreadcrumbType.System);
        });

        window.addEventListener('unload', () => {
            breadcrumbsManager.addBreadcrumb(
                `The page started unloading`,
                BreadcrumbLogLevel.Info,
                BreadcrumbType.System,
            );
        });

        window.addEventListener('pagehide', () => {
            breadcrumbsManager.addBreadcrumb(
                'User navigates away from a webpage',
                BreadcrumbLogLevel.Info,
                BreadcrumbType.User,
            );
        });

        window.addEventListener('pageshow', () => {
            breadcrumbsManager.addBreadcrumb(
                'User navigates to a webpage',
                BreadcrumbLogLevel.Info,
                BreadcrumbType.User,
            );
        });

        window.addEventListener(
            'online',
            () => {
                breadcrumbsManager.addBreadcrumb(
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
                breadcrumbsManager.addBreadcrumb(
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
