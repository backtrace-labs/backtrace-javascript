import { NO_PRELOAD_ERROR } from '../common.js';
import { PreloadIpcRpc } from './PreloadIpcRpc.js';

export function getIpcRpc() {
    if (!PreloadIpcRpc) {
        throw NO_PRELOAD_ERROR;
    }

    return PreloadIpcRpc;
}
