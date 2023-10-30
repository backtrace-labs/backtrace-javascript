import { NO_PRELOAD_ERROR } from '../common';
import { PreloadIpcRpc } from './PreloadIpcRpc';

export function getIpcRpc() {
    if (!PreloadIpcRpc) {
        throw NO_PRELOAD_ERROR;
    }

    return PreloadIpcRpc;
}
