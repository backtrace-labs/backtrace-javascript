import { BacktraceCoreClient } from '../BacktraceCoreClient';
import { BacktraceRequestHandler } from '../model/http/BacktraceRequestHandler';

export abstract class BacktraceCoreClientBuilder<T extends BacktraceCoreClient> {
    constructor(protected handler: BacktraceRequestHandler) {}
    public useRequestHandler(handler: BacktraceRequestHandler): BacktraceCoreClientBuilder<T> {
        this.handler = handler;
        return this;
    }

    public abstract build(): T;
}
