import { app, BrowserWindow } from 'electron';

const createWindow = () => {
    const win = new BrowserWindow({
        width: 1600,
        height: 900,
    });

    win.loadFile('assets/index.html');

    win.webContents.openDevTools({ mode: 'detach' });
};

app.whenReady().then(createWindow);
