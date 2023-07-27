import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary, BacktraceClient } from '@backtrace/react';
import { Fallback } from './Fallback';
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
        <ErrorBoundary fallback={<Fallback />}>
            <App />
        </ErrorBoundary>
    </React.StrictMode>,
);
