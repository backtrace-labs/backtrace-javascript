import { BacktraceClient, ErrorBoundary } from '@backtrace/react';
import { BacktraceReportSubmissionResult, BacktraceSubmissionResponse } from '@backtrace/sdk-core';
import { BacktraceSessionReplayModule } from '@backtrace/session-replay';
import { useState } from 'react';
import ReactDOM from 'react-dom/client';

const SUBMISSION_URL = new URLSearchParams(window.location.search).get('url');
if (!SUBMISSION_URL) {
    throw new Error('submission URL is required');
}

const client = BacktraceClient.initialize(
    {
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
    },
    (builder) =>
        builder.useModule(
            new BacktraceSessionReplayModule({
                maxEventCount: 100,
            }),
        ),
);

function App() {
    const [status, setStatus] = useState('waiting');
    const [rxid, setRxid] = useState('');
    const [error, setError] = useState('');

    function waitForSend(timeout: number) {
        return new Promise<BacktraceReportSubmissionResult<BacktraceSubmissionResponse>>((resolve, reject) => {
            let resolved = false;
            client.once('after-send', (report, data, attachments, result) => {
                if (!resolved) {
                    resolved = true;
                    resolve(result);
                }
            });

            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    reject(new Error('Wait for send timed out.'));
                }
            }, timeout);
        });
    }

    async function test(fn: () => Promise<BacktraceReportSubmissionResult<BacktraceSubmissionResponse>> | void) {
        setStatus('running');
        setRxid('');
        setError('');
        const waitPromise = waitForSend(5000);
        try {
            const result = (await fn()) ?? (await waitPromise);
            setStatus(result.status);
            if (result.status === 'Ok') {
                setRxid(result.result?._rxid ?? 'no rxid');
            } else {
                setError(result.message ?? 'unknown error');
            }
        } catch (err) {
            setStatus('error');
            setError((err as Error).message);
            throw err;
        }
    }

    const testException = () => test(() => client.send(new Error('test exception')));
    const testMessage = () => test(() => client.send('test message'));
    const testUnhandledException = () =>
        test(() => {
            setTimeout(() => {
                throw new Error('unhandled exception');
            }, 10);
        });

    const testUnhandledRejection = () =>
        test(() => {
            new Promise((_, reject) => reject(new Error('unhandled rejection')));
        });

    return (
        <div>
            <div id="hi">Hi!</div>
            <div id="status">{status}</div>
            <div id="error">{error}</div>
            <div id="rxid">{rxid}</div>
            <button id="test-exception" onClick={testException}>
                test exception
            </button>
            <button id="test-message" onClick={testMessage}>
                test message
            </button>
            <button id="test-unhandled-exception" onClick={testUnhandledException}>
                test unhandled exception
            </button>
            <button id="test-unhandled-rejection" onClick={testUnhandledRejection}>
                test unhandled rejection
            </button>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
    <ErrorBoundary name="main-boundary">
        <App />
    </ErrorBoundary>,
);
