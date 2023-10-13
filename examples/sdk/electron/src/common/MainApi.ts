export const Events = {
    sendError: 'sendError',
    sendMessage: 'sendMessage',
    sendUnhandledException: 'sendUnhandledException',
    sendPromiseRejection: 'sendPromiseRejection',
    generateMetric: 'generateMetric',
    sendMetrics: 'sendMetrics',
    crashApp: 'crashApp',
};

export interface MainApi {
    emit(event: keyof typeof Events): void;
}
