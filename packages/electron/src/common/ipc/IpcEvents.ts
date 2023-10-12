export const IpcEvents = {
    streamEvent(name: string, event: string) {
        return `${name}_${event}`;
    },
    sendReport: 'sendReport',
    post: 'post',
    addBreadcrumb: 'addBreadcrumb',
} as const;
