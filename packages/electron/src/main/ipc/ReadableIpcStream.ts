import { Event } from 'electron';
import { Readable, ReadableOptions } from 'stream';
import { IpcTransport } from '../../common/index.js';
import { IpcEvents } from '../../common/ipc/IpcEvents.js';
import { ipcHandshake } from '../../common/ipc/ipcHandshake.js';

export class ReadableIpcStream extends Readable {
    private _isConnected = false;

    constructor(
        private readonly _name: string,
        private readonly _ipc: IpcTransport,
        opts?: ReadableOptions,
    ) {
        super(opts);

        const close = () => this.destroy();
        const error = (_: Event, err?: Error) => this.destroy(err);
        const end = () => this.push(null);
        const data = (_: Event, chunk: unknown, encoding?: BufferEncoding) => {
            if (!this.push(chunk, encoding)) {
                _ipc.emit(IpcEvents.streamEvent(_name, 'finish'));
            }
        };

        _ipc.on(IpcEvents.streamEvent(_name, 'data'), data);
        _ipc.on(IpcEvents.streamEvent(_name, 'finish'), end);
        _ipc.on(IpcEvents.streamEvent(_name, 'close'), close);
        _ipc.on(IpcEvents.streamEvent(_name, 'error'), error);

        this.on('pause', () => _ipc.emit(IpcEvents.streamEvent(_name, 'pause')));
        this.on('resume', () => _ipc.emit(IpcEvents.streamEvent(_name, 'resume')));

        this.on('close', () => {
            _ipc.off(IpcEvents.streamEvent(_name, 'data'), data);
            _ipc.off(IpcEvents.streamEvent(_name, 'finish'), end);
            _ipc.off(IpcEvents.streamEvent(_name, 'close'), close);
            _ipc.off(IpcEvents.streamEvent(_name, 'error'), error);
        });

        ipcHandshake(_ipc, IpcEvents.streamEvent(_name, 'ready')).then(() => {
            this._isConnected = true;
            this.emit('_connected');
        });
    }

    public _read(): void {
        this.afterConnected(() => this._ipc.emit(IpcEvents.streamEvent(this._name, 'drain')));
    }

    private afterConnected(fn: () => unknown) {
        if (!this._isConnected) {
            this.once('_connected', fn);
        } else {
            fn();
        }
    }
}
