import {
    BacktraceBreadcrumbs,
    BreadcrumbLogLevel,
    BreadcrumbType,
    BreadcrumbsEventSubscriber,
} from '@backtrace/sdk-core';
import { BrowserWindow, Event, RenderProcessGoneDetails, WebContentsWillFrameNavigateEventParams, app } from 'electron';
import { point } from '../attributes/helpers/attributes';

export class WindowEventSubscriber implements BreadcrumbsEventSubscriber {
    private readonly _toDispose: Array<() => void> = [];

    public start(breadcrumbs: BacktraceBreadcrumbs): void {
        app.on('browser-window-created', (_, window) => this.registerWindow(window, breadcrumbs));

        for (const window of BrowserWindow.getAllWindows()) {
            this.registerWindow(window, breadcrumbs);
        }
    }

    public dispose(): void {
        for (const dispose of this._toDispose) {
            dispose();
        }
    }

    private registerWindow(window: BrowserWindow, breadcrumbs: BacktraceBreadcrumbs) {
        const disposeWindowEvents = this.listenForWindowEvents(window, breadcrumbs);
        const disposeWebContentsEvents = this.listenOnWebContentsEvents(window, breadcrumbs);
        const dispose = () => {
            disposeWindowEvents();
            disposeWebContentsEvents();
        };

        this._toDispose.push(dispose);
        window.once('closed', () => {
            dispose();
            this._toDispose.splice(this._toDispose.indexOf(dispose), 1);
        });
    }

    private listenForWindowEvents(window: BrowserWindow, breadcrumbs: BacktraceBreadcrumbs) {
        const windowMsg = (msg: string) => `Window ${window.title} (ID: ${window.id}) ${msg}`;

        const onClose = () =>
            breadcrumbs.addBreadcrumb(windowMsg('is closing'), BreadcrumbLogLevel.Info, BreadcrumbType.System);

        const onClosed = () =>
            breadcrumbs.addBreadcrumb(windowMsg('is closed'), BreadcrumbLogLevel.Info, BreadcrumbType.System);

        const onUnresponsive = () =>
            breadcrumbs.addBreadcrumb(
                windowMsg('became unresponsive'),
                BreadcrumbLogLevel.Warning,
                BreadcrumbType.System,
            );

        const onResponsive = () =>
            breadcrumbs.addBreadcrumb(
                windowMsg('became responsive'),
                BreadcrumbLogLevel.Warning,
                BreadcrumbType.System,
            );

        const onBlur = () =>
            breadcrumbs.addBreadcrumb(windowMsg('lost focus'), BreadcrumbLogLevel.Info, BreadcrumbType.System);
        const onFocus = () =>
            breadcrumbs.addBreadcrumb(windowMsg('focused'), BreadcrumbLogLevel.Info, BreadcrumbType.System);
        const onShow = () =>
            breadcrumbs.addBreadcrumb(windowMsg('shown'), BreadcrumbLogLevel.Info, BreadcrumbType.System);
        const onHide = () =>
            breadcrumbs.addBreadcrumb(windowMsg('hidden'), BreadcrumbLogLevel.Info, BreadcrumbType.System);
        const onReadyToShow = () =>
            breadcrumbs.addBreadcrumb(windowMsg('ready to show'), BreadcrumbLogLevel.Info, BreadcrumbType.System);

        const onMaximize = () =>
            breadcrumbs.addBreadcrumb(windowMsg('maximized'), BreadcrumbLogLevel.Info, BreadcrumbType.System);

        const onUnmaximize = () =>
            breadcrumbs.addBreadcrumb(windowMsg('unmaximized'), BreadcrumbLogLevel.Info, BreadcrumbType.System);

        const onMinimize = () =>
            breadcrumbs.addBreadcrumb(windowMsg('minimized'), BreadcrumbLogLevel.Info, BreadcrumbType.System);

        const onRestore = () =>
            breadcrumbs.addBreadcrumb(
                windowMsg('restored from minimized state'),
                BreadcrumbLogLevel.Info,
                BreadcrumbType.System,
            );

        const onResized = () =>
            breadcrumbs.addBreadcrumb(windowMsg('resized'), BreadcrumbLogLevel.Info, BreadcrumbType.System, {
                ...point('size', window.getSize()),
            });

        const onFullScreen = () =>
            breadcrumbs.addBreadcrumb(windowMsg('entered full screen'), BreadcrumbLogLevel.Info, BreadcrumbType.System);

        const onLeaveFullScreen = () =>
            breadcrumbs.addBreadcrumb(windowMsg('left full screen'), BreadcrumbLogLevel.Info, BreadcrumbType.System);

        const onAppCommand = (_: Event, command: string) =>
            breadcrumbs.addBreadcrumb(
                windowMsg(`invoked command ${command}`),
                BreadcrumbLogLevel.Info,
                BreadcrumbType.System,
            );

        window.on('close', onClose);
        window.on('closed', onClosed);
        window.on('unresponsive', onUnresponsive);
        window.on('responsive', onResponsive);
        window.on('blur', onBlur);
        window.on('focus', onFocus);
        window.on('show', onShow);
        window.on('hide', onHide);
        window.on('ready-to-show', onReadyToShow);
        window.on('maximize', onMaximize);
        window.on('unmaximize', onUnmaximize);
        window.on('minimize', onMinimize);
        window.on('restore', onRestore);
        window.on('resized', onResized);
        window.on('enter-full-screen', onFullScreen);
        window.on('enter-html-full-screen', onFullScreen);
        window.on('leave-full-screen', onLeaveFullScreen);
        window.on('leave-html-full-screen', onLeaveFullScreen);
        window.on('app-command', onAppCommand);

        return () => {
            window.off('close', onClose);
            window.off('closed', onClosed);
            window.off('unresponsive', onUnresponsive);
            window.off('responsive', onResponsive);
            window.off('blur', onBlur);
            window.off('focus', onFocus);
            window.off('show', onShow);
            window.off('hide', onHide);
            window.off('ready-to-show', onReadyToShow);
            window.off('maximize', onMaximize);
            window.off('unmaximize', onUnmaximize);
            window.off('minimize', onMinimize);
            window.off('restore', onRestore);
            window.off('resize', onResized);
            window.off('enter-full-screen', onFullScreen);
            window.off('enter-html-full-screen', onFullScreen);
            window.off('leave-full-screen', onLeaveFullScreen);
            window.off('leave-html-full-screen', onLeaveFullScreen);
            window.off('app-command', onAppCommand);
        };
    }

    private listenOnWebContentsEvents(window: BrowserWindow, breadcrumbs: BacktraceBreadcrumbs) {
        const webContents = window.webContents;
        const windowMsg = (msg: string) => `Window ${window.title} (ID: ${window.id}) ${msg}`;

        const onDidFinishLoad = () =>
            breadcrumbs.addBreadcrumb(windowMsg('finished loading'), BreadcrumbLogLevel.Info, BreadcrumbType.System);

        const onDidFailLoad = () =>
            breadcrumbs.addBreadcrumb(windowMsg('failed to load'), BreadcrumbLogLevel.Error, BreadcrumbType.System);

        const onDidFailProvisionalLoad = () =>
            breadcrumbs.addBreadcrumb(
                windowMsg('cancelled loading'),
                BreadcrumbLogLevel.Warning,
                BreadcrumbType.System,
            );

        const onWillFrameNavigation = (event: Event<WebContentsWillFrameNavigateEventParams>) =>
            breadcrumbs.addBreadcrumb(windowMsg('started navigation'), BreadcrumbLogLevel.Info, BreadcrumbType.System, {
                frameTreeNodeId: event.frame.frameTreeNodeId,
                url: event.url,
                isMainFrame: event.isMainFrame,
                isSameDocument: event.isSameDocument,
            });

        const onDidFrameNavigate = (
            _: Event,
            url: string,
            httpResponseCode: number,
            httpStatusText: string,
            isMainFrame: boolean,
            frameProcessId: number,
            frameRoutingId: number,
        ) =>
            breadcrumbs.addBreadcrumb(windowMsg('navigated'), BreadcrumbLogLevel.Info, BreadcrumbType.System, {
                frameProcessId,
                frameRoutingId,
                url,
                isMainFrame,
                httpResponseCode,
                httpStatusText,
            });

        const onRenderProcessGone = (_: Event, details: RenderProcessGoneDetails) => {
            const attributes = { exitCode: details.exitCode, reason: details.reason };

            switch (details.reason) {
                case 'clean-exit':
                    return breadcrumbs.addBreadcrumb(
                        windowMsg('renderer process exited'),
                        BreadcrumbLogLevel.Info,
                        BreadcrumbType.System,
                        attributes,
                    );
                case 'abnormal-exit':
                    return breadcrumbs.addBreadcrumb(
                        windowMsg('renderer process exited abnormally'),
                        BreadcrumbLogLevel.Error,
                        BreadcrumbType.System,
                        attributes,
                    );
                case 'killed':
                    return breadcrumbs.addBreadcrumb(
                        windowMsg('renderer process was killed'),
                        BreadcrumbLogLevel.Warning,
                        BreadcrumbType.System,
                        attributes,
                    );
                case 'crashed':
                    return breadcrumbs.addBreadcrumb(
                        windowMsg('renderer process crashed'),
                        BreadcrumbLogLevel.Error,
                        BreadcrumbType.System,
                        attributes,
                    );
                case 'oom':
                    return breadcrumbs.addBreadcrumb(
                        windowMsg('renderer process ran out of memory'),
                        BreadcrumbLogLevel.Error,
                        BreadcrumbType.System,
                        attributes,
                    );
                case 'launch-failed':
                    return breadcrumbs.addBreadcrumb(
                        windowMsg('renderer process failed to launch'),
                        BreadcrumbLogLevel.Error,
                        BreadcrumbType.System,
                        attributes,
                    );
                case 'integrity-failure':
                    return breadcrumbs.addBreadcrumb(
                        windowMsg('renderer process integrity checks failed'),
                        BreadcrumbLogLevel.Error,
                        BreadcrumbType.System,
                        attributes,
                    );
                default:
                    return breadcrumbs.addBreadcrumb(
                        windowMsg('renderer process exited'),
                        BreadcrumbLogLevel.Error,
                        BreadcrumbType.System,
                        attributes,
                    );
            }
        };

        webContents.on('did-finish-load', onDidFinishLoad);
        webContents.on('did-fail-load', onDidFailLoad);
        webContents.on('did-fail-provisional-load', onDidFailProvisionalLoad);
        webContents.on('will-frame-navigate', onWillFrameNavigation);
        webContents.on('did-frame-navigate', onDidFrameNavigate);
        webContents.on('render-process-gone', onRenderProcessGone);

        return () => {
            webContents.off('did-finish-load', onDidFinishLoad);
            webContents.off('did-fail-load', onDidFailLoad);
            webContents.off('did-fail-provisional-load', onDidFailProvisionalLoad);
            webContents.off('will-frame-navigate', onWillFrameNavigation);
            webContents.off('did-frame-navigate', onDidFrameNavigate);
            webContents.off('render-process-gone', onRenderProcessGone);
        };
    }
}
