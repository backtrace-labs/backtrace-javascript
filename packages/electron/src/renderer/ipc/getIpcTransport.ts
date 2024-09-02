import { NO_PRELOAD_ERROR } from '../common.js';
import { PreloadIpcTransport } from './PreloadIpcTransport.js';

export function getIpcTransport() {
    if (!PreloadIpcTransport) {
        throw NO_PRELOAD_ERROR;
    }

    return PreloadIpcTransport;
}
