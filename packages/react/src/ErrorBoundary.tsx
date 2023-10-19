import { Component, ErrorInfo, isValidElement, ReactElement, ReactNode } from 'react';
import { BacktraceReport } from '.';
import { BacktraceClient } from './BacktraceClient';

type RenderFallback = (error: Error) => ReactElement;

export interface Props {
    children: ReactNode;
    fallback?: ReactElement | RenderFallback;
    name?: string;
}

export interface State {
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    private _client: BacktraceClient;
    private COMPONENT_THREAD_NAME = 'component-stack';
    constructor(props: Props) {
        super(props);
        this.state = {
            error: undefined,
        };
        // grabbing here so it will fail fast if BacktraceClient is uninitialized
        const client = BacktraceClient.instance;
        if (!client) {
            throw new Error('BacktraceClient is uninitialized. Call "BacktraceClient.initialize" function first.');
        }
        this._client = client;
    }

    public static getDerivedStateFromError(error: Error) {
        return { error };
    }

    public async componentDidCatch(error: Error, info: ErrorInfo) {
        const { name } = this.props;
        const report = new BacktraceReport(error, {
            'errorboundary.name': name ?? 'main',
            'error.type': 'Unhandled exception',
        });
        report.addStackTrace(this.COMPONENT_THREAD_NAME, info.componentStack as string);
        await this._client.send(report);
    }

    render() {
        const { fallback, children } = this.props;

        if (!this.state.error) {
            return children;
        }

        const fallbackComponent = typeof fallback === 'function' ? fallback(this.state.error) : fallback;

        if (fallbackComponent && isValidElement(fallbackComponent)) {
            return fallbackComponent;
        }

        // no or invalid fallback
        return null;
    }
}
