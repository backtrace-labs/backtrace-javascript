const prefix = '__BACKTRACE';

export const IpcEvents = {
    streamEvent(name: string, event: string) {
        return `${prefix}_${name}_${event}`;
    },
    sendReport: `${prefix}_sendReport`,
    post: `${prefix}_post`,
    addBreadcrumb: `${prefix}_addBreadcrumb`,
} as const;
