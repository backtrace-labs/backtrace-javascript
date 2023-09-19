import { BacktraceCoreClient } from '..';

export interface BacktraceModule {
    initialize(client: BacktraceCoreClient): void;
    dispose?(): void;
}
