import { BrowserWindow, WebFrameMain } from 'electron';

export function getBrowserWindowAttributes(
    window: BrowserWindow,
    visited = new Set<number>(),
): Record<string, unknown> {
    if (visited.has(window.id)) {
        return getRef('id', window.id);
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
            opener: window.webContents.opener ? getRef('id', window.webContents.opener.frameTreeNodeId) : null,
        },
    };
}

export function getBasicBrowserWindowAttributes(window: BrowserWindow) {
    return {
        id: window.id,
        documentEdited: window.documentEdited,
        fullScreen: window.fullScreen,
        kiosk: window.kiosk,
        simpleFullScreen: window.simpleFullScreen,
        title: window.title,
        visibleOnAllWorkspaces: window.visibleOnAllWorkspaces,

        bounds: window.getBounds(),
        contentBounds: window.getContentBounds(),
        ...point('contentSize', window.getContentSize()),
        ...point('maximumSize', window.getMaximumSize()),
        mediaSourceId: window.getMediaSourceId(),
        ...point('minimumSize', window.getMinimumSize()),
        normalBounds: window.getNormalBounds(),
        opacity: window.getOpacity(),
        ...point('position', window.getPosition()),
        ...point('position', window.getPosition()),
        ...point('size', window.getSize()),

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
        framesInSubtree: frame.framesInSubtree.map((f) => getRef('id', f.frameTreeNodeId)),
        top: frame.top ? getRef('id', frame.top.frameTreeNodeId) : null,

        name: frame.name,
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

function point(name: string, point: number[]) {
    return {
        [`${name}.x`]: point[0],
        [`${name}.y`]: point[1],
    } as const;
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
