import { BacktraceClient, ErrorBoundary } from '@backtrace/react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Fallback from './components/Fallback';
import { SUBMISSION_URL } from './consts';

BacktraceClient.initialize({
    url: SUBMISSION_URL,
    name: '@backtrace/react-example',
    version: '0.0.1',
    userAttributes: {
        'custom-attribute': 'test',
        'custom-annotation': {
            prop1: true,
            prop2: 123,
        },
    },
});

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
    <React.StrictMode>
        <ErrorBoundary name="main-boundary" fallback={(error: Error) => <Fallback error={error} />}>
            <App />
        </ErrorBoundary>
    </React.StrictMode>,
);
