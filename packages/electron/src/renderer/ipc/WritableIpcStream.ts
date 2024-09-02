import { IpcEvents } from '../../common/ipc/IpcEvents.js';
import { ipcHandshake } from '../../common/ipc/ipcHandshake.js';
import { IpcTransport } from '../../common/ipc/IpcTransport.js';

function waitOnce(event: string, ipc: IpcTransport) {
    return new Promise<void>((resolve) => ipc.once(event, () => resolve()));
}

export class WritableIpcStream<W> extends WritableStream<W> {
    constructor(name: string, ipc: IpcTransport) {
        super(new WritableIpcStreamSink(name, ipc));
    }
}

class WritableIpcStreamSink<W> implements UnderlyingSink<W> {
    private _isPaused = false;

    constructor(
        private readonly _name: string,
        private readonly _ipc: IpcTransport,
    ) {
        this._ipc.on(IpcEvents.streamEvent(_name, 'pause'), () => (this._isPaused = true));
        this._ipc.on(IpcEvents.streamEvent(_name, 'resume'), () => (this._isPaused = false));
    }

    public start() {
        return ipcHandshake(this._ipc, IpcEvents.streamEvent(this._name, 'ready'));
    }

    public async write(chunk: W) {
        await waitOnce(IpcEvents.streamEvent(this._name, 'drain'), this._ipc);

        if (this._isPaused) {
            await waitOnce(IpcEvents.streamEvent(this._name, 'resume'), this._ipc);
        }

        this._ipc.emit(IpcEvents.streamEvent(this._name, 'data'), chunk);
    }

    public close() {
        this._ipc.emit(IpcEvents.streamEvent(this._name, 'finish'));
    }

    public abort() {
        this._ipc.emit(IpcEvents.streamEvent(this._name, 'error'), new Error('Stream has been aborted.'));
    }
}
