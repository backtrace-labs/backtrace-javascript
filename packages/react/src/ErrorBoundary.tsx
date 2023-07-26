import { Component, ErrorInfo, ReactElement, ReactNode, isValidElement } from 'react';
import { BacktraceClient } from './BacktraceClient';
import { BacktraceReport } from '.';
import { isReact16ComponentStack, parseReact16ComponentStack } from './helpers/componentStackHelpers';

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
        const dataBuilder = this._client.dataBuilder;
        const report = new BacktraceReport(error);
        const backtraceData = dataBuilder.build(report);

        const { componentStack } = info;
        const frames = isReact16ComponentStack(componentStack)
            ? parseReact16ComponentStack(componentStack)
            : this._client.stackTraceConverter.convert(componentStack, this.COMPONENT_THREAD_NAME);

        backtraceData.threads[this.COMPONENT_THREAD_NAME] = {
            fault: false,
            name: this.COMPONENT_THREAD_NAME,
            stack: frames,
        };

        await this._client.send(backtraceData);
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
