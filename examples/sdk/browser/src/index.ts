import { BacktraceClient, BacktraceStringAttachment } from '@backtrace/browser';
import { SUBMISSION_URL } from './consts';

const client = BacktraceClient.builder({
    url: SUBMISSION_URL,
    name: '@backtrace/browser-example',
    version: '0.0.1',
    userAttributes: {
        'custom-attribute': 'test',
        'custom-annotation': {
            prop1: true,
            prop2: 123,
        },
    },
}).build();

function parseNotExistingDomElement(): string {
    const element = document.getElementById('not-existing-id') as HTMLElement;
    return element.outerText.split('\n')[1].toString();
}

const sendErrorButton = document.getElementById('send-error') as HTMLElement;
const sendMessageButton = document.getElementById('send-message') as HTMLElement;
const sendUnhandledExceptionButton = document.getElementById('send-unhandled-exception') as HTMLElement;
const sendPromiseRejectionButton = document.getElementById('send-promise-rejection') as HTMLElement;
const generateMetricButton = document.getElementById('generate-metric') as HTMLElement;
const sendMetricsButton = document.getElementById('send-metrics') as HTMLElement;

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
sendErrorButton.onclick = sendHandledException;
sendMessageButton.onclick = sendMessage;
generateMetricButton.onclick = generateMetric;
sendMetricsButton.onclick = sendMetrics;
sendUnhandledExceptionButton.onclick = unhandledException;
sendPromiseRejectionButton.onclick = unhandledPromiseRejection;
