import '@backtrace-labs/electron/main/preload';
import { contextBridge, ipcRenderer } from 'electron';
import { MainApi } from '../common/MainApi';

const mainApi: MainApi = {
    emit(event) {
        console.log(`emitting ${event} to main process`);
        ipcRenderer.send(event);
    },
};

contextBridge.exposeInMainWorld('mainApi', mainApi);
