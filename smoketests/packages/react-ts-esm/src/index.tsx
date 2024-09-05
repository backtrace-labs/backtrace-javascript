import { BacktraceClient, ErrorBoundary } from '@backtrace/react';
import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';

const SUBMISSION_URL = new URLSearchParams(window.location.search).get('url');
if (!SUBMISSION_URL) {
    throw new Error('submission URL is required');
}

const client = BacktraceClient.initialize({
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

function App() {
    const [status, setStatus] = useState('loading');
    const [rxid, setRxid] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        client
            .send('react test error')
            .then((result) => {
                setStatus(result.status);
                if (result.status === 'Ok') {
                    setRxid(result.result?._rxid ?? 'no rxid');
                } else {
                    setError(result.message ?? 'unknown error');
                }
            })
            .catch((reason) => {
                setStatus('error');
                setError(reason);
            });
    }, []);

    return (
        <div>
            <div id="hi">Hi!</div>
            <div id="status">{status}</div>
            <div id="error">{error}</div>
            <div id="rxid">{rxid}</div>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
    <ErrorBoundary name="main-boundary">
        <App />
    </ErrorBoundary>,
);
