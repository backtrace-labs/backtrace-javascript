import { Component, ErrorInfo, ReactElement, ReactNode, isValidElement } from 'react';
import { BacktraceClient } from './BacktraceClient';
import { BacktraceReport } from '.';

type RenderFallback = () => ReactElement;

export interface Props {
    children: ReactNode;
    fallback?: ReactElement | RenderFallback;
}

export interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    private _client: BacktraceClient;
    private COMPONENT_THREAD_NAME = 'component-stack';
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: undefined,
        };
        // grabbing here so it will fail fast if BacktraceClient is uninitialized
        this._client = BacktraceClient.instance;
    }

    public static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    public async componentDidCatch(error: Error, info: ErrorInfo) {
        const report = new BacktraceReport(error);
        report.addStackTrace(this.COMPONENT_THREAD_NAME, info.componentStack);
        await this._client.send(report);
    }

    render() {
        const { fallback, children } = this.props;

        if (!this.state.hasError) {
            return children;
        }

        const fallbackComponent = typeof fallback === 'function' ? fallback() : fallback;

        if (fallbackComponent && isValidElement(fallbackComponent)) {
            return fallbackComponent;
        }

        // no or invalid fallback
        return null;
    }
}
