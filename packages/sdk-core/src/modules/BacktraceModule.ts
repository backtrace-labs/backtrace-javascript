import { BacktraceCoreClient } from '..';

export interface BacktraceModule {
    bind?(client: BacktraceCoreClient): void;
    initialize(): void;
    dispose?(): void;
}
