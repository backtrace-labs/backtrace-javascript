import { Component, ErrorInfo, ReactElement, ReactNode, isValidElement } from 'react';

type RenderFallback = () => ReactElement;

export type Props = {
    children: ReactNode;
    fallback?: ReactElement | RenderFallback;
};

export type State = {
    hasError: boolean;
    error?: Error;
};

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: undefined,
        };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        const client = window.backtraceClient;

        if (client) {
            client.send(error);
        }
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
