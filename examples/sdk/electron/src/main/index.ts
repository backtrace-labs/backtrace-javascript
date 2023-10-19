import { BacktraceClient } from '@backtrace-labs/electron';
import { BrowserWindow, app, ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';
import { Events } from '../common/MainApi';
import { SUBMISSION_URL } from './consts';

function handleEvent(event: keyof typeof Events, fn: () => unknown) {
    ipcMain.on(event, fn);
}

const client = BacktraceClient.initialize({
    url: SUBMISSION_URL,
    attachments: [path.join(process.cwd(), 'samplefile.txt')],
    rateLimit: 5,
    userAttributes: {
        'custom-attribute': 'test',
        'custom-annotation': {
            prop1: true,
            prop2: 123,
        },
    },
    database: {
        enable: true,
        path: path.join(process.cwd(), 'database'),
        captureNativeCrashes: true,
        createDatabaseDirectory: true,
    },
});

async function sendHandledException() {
    console.log('Sending an error to Backtrace');
    try {
        fs.readFileSync('/path/to/not/existing/file');
    } catch (err) {
        await client.send(err as Error, { action: 'send-error' });
    }
}

async function sendMessage() {
    console.log('Sending a text message to Backtrace');
    await client.send('test-message', { action: 'send-message' });
}

function generateMetric() {
    console.log('Generating a metric');
    if (!client.metrics) {
        console.log('metrics are unavailable');
        return;
    }
    client.metrics.addSummedEvent('click');
}

function sendMetrics() {
    console.log('Sending metrics to Backtrace');
    if (!client.metrics) {
        console.log('metrics are unavailable');
        return;
    }
    client.metrics.send();
}

function unhandledPromiseRejection() {
    console.log('Rejecting promise without .catch and finally.');
    return new Promise(() => {
        throw new Error('Promise rejection');
    });
}

function unhandledException() {
    console.log('Throwing an unhandled exception');
    throw new Error('unhandled exception');
}

function crashApp() {
    console.log('Crashing the application');
    process.crash();
}

handleEvent('sendError', sendHandledException);
handleEvent('sendMessage', sendMessage);
handleEvent('generateMetric', generateMetric);
handleEvent('sendMetrics', sendMetrics);
handleEvent('sendPromiseRejection', unhandledPromiseRejection);
handleEvent('sendUnhandledException', unhandledException);
handleEvent('crashApp', crashApp);

const createWindow = () => {
    const win = new BrowserWindow({
        width: 1600,
        height: 900,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    win.loadFile('assets/index.html');
    win.webContents.openDevTools({ mode: 'detach' });
};

app.whenReady().then(createWindow);
