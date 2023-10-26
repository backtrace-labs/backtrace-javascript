import { BrowserWindow, WebFrameMain } from 'electron';

export function getBrowserWindowAttributes(
    window: BrowserWindow,
    visited = new Set<number>(),
): Record<string, unknown> {
    if (visited.has(window.id)) {
        return getRef('windowId', window.id);
    }

    visited.add(window.id);

    const parent = window.getParentWindow();
    const basic = getBasicBrowserWindowAttributes(window);

    return {
        ...basic,

        childWindows: window.getChildWindows().map((w) => getBrowserWindowAttributes(w, visited)),
        parentWindow: parent ? getBrowserWindowAttributes(parent, visited) : null,

        webContents: {
            ...basic.webContents,

            mainFrame: getWebFrameAttributes(window.webContents.mainFrame),
        },
    };
}

export function getBasicBrowserWindowAttributes(window: BrowserWindow) {
    const parent = window.getParentWindow();

    return {
        accessibleTitle: window.accessibleTitle,
        autoHideMenuBar: window.autoHideMenuBar,
        closable: window.closable,
        documentEdited: window.documentEdited,
        excludedFromShownWindowsMenu: window.excludedFromShownWindowsMenu,
        focusable: window.focusable,
        fullScreen: window.fullScreen,
        fullScreenable: window.fullScreenable,
        id: window.id,
        kiosk: window.kiosk,
        maximizable: window.maximizable,
        menuBarVisible: window.menuBarVisible,
        minimizable: window.minimizable,
        movable: window.movable,
        representedFilename: window.representedFilename,
        resizable: window.resizable,
        shadow: window.shadow,
        simpleFullScreen: window.simpleFullScreen,
        title: window.title,
        visibleOnAllWorkspaces: window.visibleOnAllWorkspaces,

        isAlwaysOnTop: window.isAlwaysOnTop(),
        isEnabled: window.isEnabled(),
        isFocused: window.isFocused(),
        isHiddenInMissionControl: window.isHiddenInMissionControl(),
        isMaximized: window.isMaximized(),
        isMenuBarAutoHide: window.isMenuBarAutoHide(),
        isMinimized: window.isMinimized(),
        isModal: window.isModal(),
        isNormal: window.isNormal(),
        isSimpleFullScreen: window.isSimpleFullScreen(),
        isTabletMode: window.isTabletMode(),
        isVisible: window.isVisible(),
        isVisibleOnAllWorkspaces: window.isVisibleOnAllWorkspaces(),

        backgroundColor: window.getBackgroundColor(),
        bounds: window.getBounds(),
        contentBounds: window.getContentBounds(),
        contentSize: window.getContentSize(),
        maximumSize: window.getMaximumSize(),
        mediaSourceId: window.getMediaSourceId(),
        minimumSize: window.getMinimumSize(),
        normalBounds: window.getNormalBounds(),
        opacity: window.getOpacity(),
        position: window.getPosition(),
        size: window.getSize(),
        windowButtonPosition: window.getWindowButtonPosition(),

        childWindows: window.getChildWindows().map((w) => getRef('windowId', w.id)),
        parentWindow: parent ? getRef('windowId', parent.id) : null,

        webContents: {
            audioMuted: window.webContents.audioMuted,
            backgroundThrottling: window.webContents.backgroundThrottling,
            frameRate: window.webContents.frameRate,
            id: window.webContents.id,
            userAgent: window.webContents.userAgent,
            zoomFactor: window.webContents.zoomFactor,
            zoomLevel: window.webContents.zoomLevel,

            isAudioMuted: window.webContents.isAudioMuted(),
            isBeingCaptured: window.webContents.isBeingCaptured(),
            isCrashed: window.webContents.isCrashed(),
            isCurrentlyAudible: window.webContents.isCurrentlyAudible(),
            isDestroyed: window.webContents.isDestroyed(),
            isDevToolsFocused: window.webContents.isDevToolsFocused(),
            isDevToolsOpened: window.webContents.isDevToolsOpened(),
            isFocused: window.webContents.isFocused(),
            isLoading: window.webContents.isLoading(),
            isLoadingMainFrame: window.webContents.isLoadingMainFrame(),
            isOffscreen: window.webContents.isOffscreen(),
            isPainting: window.webContents.isPainting(),
            isWaitingForResponse: window.webContents.isWaitingForResponse(),

            mainFrame: getWebFrameAttributes(window.webContents.mainFrame),
            opener: window.webContents.opener
                ? getRef('frameTreeNodeId', window.webContents.opener.frameTreeNodeId)
                : null,
        },
    };
}

function getWebFrameAttributes(frame: WebFrameMain, visited = new Set<number>()): Record<string, unknown> {
    if (visited.has(frame.frameTreeNodeId)) {
        return getRef('frameTreeNodeId', frame.frameTreeNodeId);
    }

    visited.add(frame.frameTreeNodeId);
    const basic = getBasicWebFrameAttributes(frame);

    return {
        ...basic,
        framesInSubtree: frame.framesInSubtree.map((f) => getWebFrameAttributes(f, visited)),
        top: frame.top ? getWebFrameAttributes(frame.top, visited) : null,
    };
}

function getBasicWebFrameAttributes(frame: WebFrameMain): Record<string, unknown> {
    return {
        frameTreeNodeId: frame.frameTreeNodeId,
        framesInSubtree: frame.framesInSubtree.map((f) => getRef('frameTreeNodeId', f.frameTreeNodeId)),
        top: frame.top ? getRef('frameTreeNodeId', frame.top.frameTreeNodeId) : null,

        name: frame.name,
        origin: frame.origin,
        osProcessId: frame.osProcessId,
        routingId: frame.routingId,
        url: frame.url,
        visibilityState: frame.visibilityState,
    };
}

function getRef(name: string, value: unknown) {
    const ref = { [`$${name}`]: value };

    return {
        _ref: true,
        ...ref,
        toJSON() {
            return ref;
        },
    };
}

export function flatten(obj: object, parentKey?: string) {
    const result: Record<string, unknown> = {};

    for (const key in obj) {
        const value = obj[key as keyof typeof obj];
        if (typeof value === 'object') {
            Object.assign(result, flatten(value, parentKey ? `${parentKey}.${key}` : key));
        } else {
            result[parentKey ? `${parentKey}.${key}` : key] = value;
        }
    }

    return result;
}
