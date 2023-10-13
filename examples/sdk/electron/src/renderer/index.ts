import { BacktraceClient, BacktraceStringAttachment } from '@backtrace-labs/browser';
import { addBacktraceElectron } from '@backtrace-labs/electron/lib/renderer';
import { Events, MainApi } from '../common/MainApi';

declare global {
    interface Window {
        readonly mainApi: MainApi;
    }
}

const mainApi = window.mainApi;

const client = BacktraceClient.initialize(
    {
        url: 'none',
        name: '@backtrace-labs/electron-renderer',
        version: '0.0.1',
        userAttributes: {
            'custom-attribute': 'test',
            'custom-annotation': {
                prop1: true,
                prop2: 123,
            },
        },
    },
    (builder) => addBacktraceElectron(builder),
);

function parseNotExistingDomElement(): string {
    const element = document.getElementById('not-existing-id') as HTMLElement;
    return element.outerText.split('\n')[1].toString();
}

const sendErrorButton = document.querySelectorAll<HTMLElement>('.send-error');
const sendMessageButton = document.querySelectorAll<HTMLElement>('.send-message');
const sendUnhandledExceptionButton = document.querySelectorAll<HTMLElement>('.send-unhandled-exception');
const sendPromiseRejectionButton = document.querySelectorAll<HTMLElement>('.send-promise-rejection');
const generateMetricButton = document.querySelectorAll<HTMLElement>('.generate-metric');
const sendMetricsButton = document.querySelectorAll<HTMLElement>('.send-metrics');
const crashAppButton = document.querySelectorAll<HTMLElement>('.crash-app');

async function sendHandledException() {
    try {
        console.log('send-error click');
        parseNotExistingDomElement();
    } catch (err) {
        await client.send(err as Error, { action: 'send-error' }, [
            new BacktraceStringAttachment('test.txt', 'sample attachment content'),
        ]);
    }
}

async function sendMessage() {
    console.log('send-message click');
    await client.send('test-message', { action: 'send-message' }, [
        new BacktraceStringAttachment('test.txt', 'sample attachment content'),
    ]);
}

function generateMetric() {
    console.log('generate-metric click');
    if (!client.metrics) {
        console.log('metrics are unavailable');
        return;
    }
    client.metrics.addSummedEvent('click');
}

function sendMetrics() {
    console.log('send-metrics click');
    if (!client.metrics) {
        console.log('metrics are unavailable');
        return;
    }
    client.metrics.send();
}

function unhandledPromiseRejection() {
    console.log('unhandled promise rejection');
    return new Promise(() => {
        throw new Error('Promise rejection');
    });
}

function unhandledException() {
    console.log('unhandled exception');
    throw new Error('unhandled exception');
}

function routeMainRenderer(mainFn: () => unknown, rendererFn: () => unknown) {
    return (ev: Event) => {
        const target = ev.currentTarget as HTMLElement;
        const targetName = target.getAttribute('data-target');
        switch (targetName) {
            case 'main':
                return mainFn();
            case 'renderer':
                return rendererFn();
            default:
                throw new Error(`unknown target ${targetName}`);
        }
    };
}

function emitToMain(event: keyof typeof Events) {
    return () => mainApi.emit(event);
}

sendErrorButton.forEach((el) => (el.onclick = routeMainRenderer(emitToMain('sendError'), sendHandledException)));
sendMessageButton.forEach((el) => (el.onclick = routeMainRenderer(emitToMain('sendMessage'), sendMessage)));
generateMetricButton.forEach((el) => (el.onclick = routeMainRenderer(emitToMain('generateMetric'), generateMetric)));
sendMetricsButton.forEach((el) => (el.onclick = routeMainRenderer(emitToMain('sendMetrics'), sendMetrics)));
sendUnhandledExceptionButton.forEach(
    (el) => (el.onclick = routeMainRenderer(emitToMain('sendUnhandledException'), unhandledException)),
);
sendPromiseRejectionButton.forEach(
    (el) => (el.onclick = routeMainRenderer(emitToMain('sendPromiseRejection'), unhandledPromiseRejection)),
);
crashAppButton.forEach((el) => (el.onclick = emitToMain('crashApp')));
