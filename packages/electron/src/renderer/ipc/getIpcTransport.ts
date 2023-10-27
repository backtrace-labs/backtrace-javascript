import { NO_PRELOAD_ERROR } from '../common';
import { PreloadIpcTransport } from './PreloadIpcTransport';

export function getIpcTransport() {
    if (!PreloadIpcTransport) {
        throw NO_PRELOAD_ERROR;
    }

    return PreloadIpcTransport;
}
