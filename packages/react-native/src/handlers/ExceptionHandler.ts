import { BacktraceClient } from '../BacktraceClient';

export interface ExceptionHandler {
    captureUnhandledPromiseRejections(client: BacktraceClient): void;
    captureManagedErrors(client: BacktraceClient): void;
    dispose(): void;
}
