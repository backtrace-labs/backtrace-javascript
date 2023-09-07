import {
    BacktraceClient as BacktraceReactClient,
    ErrorBoundary as ReactErrorBoundary,
    type Props,
} from '@backtrace-labs/react';
import { BacktraceClient } from '.';
export class ErrorBoundary extends ReactErrorBoundary {
    constructor(props: Props) {
        super(props, BacktraceClient.instance as unknown as BacktraceReactClient);
    }
}
