import { ElectronWindowModule } from '@backtrace-labs/electron/lib/main';
import { BacktraceClient } from '@backtrace-labs/node';
import { BrowserWindow, app } from 'electron';
import path from 'path';
import { SUBMISSION_URL } from './consts';

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

const createWindow = () => {
    const win = new BrowserWindow({
        width: 1600,
        height: 900,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    win.loadFile('assets/index.html');
    client.addModule(new ElectronWindowModule(win));
    win.webContents.openDevTools({ mode: 'detach' });
};

app.whenReady().then(createWindow);
