const prefix = '__BACKTRACE';

export const IpcEvents = {
    streamEvent(name: string, event: string) {
        return `${prefix}_${name}_${event}`;
    },
    addSummedMetric: `${prefix}_addSummedMetric`,
    sendMetrics: `${prefix}_sendMetrics`,
    sendReport: `${prefix}_sendReport`,
    sendAttachment: `${prefix}_sendAttachment`,
    post: `${prefix}_post`,
    addBreadcrumb: `${prefix}_addBreadcrumb`,
    sync: `${prefix}_sync`,
    ping: `${prefix}_ping`,
} as const;
