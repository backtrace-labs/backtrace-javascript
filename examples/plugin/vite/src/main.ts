import { BacktraceClient, BacktraceStringAttachment } from '@backtrace/browser';

// Submission URL for error reports (different token from sourcemap upload)
// Set VITE_BACKTRACE_SUBMISSION_URL environment variable
const submissionUrl = import.meta.env.VITE_BACKTRACE_SUBMISSION_URL;

const client = BacktraceClient.builder({
    url: submissionUrl,
    name: 'vite-plugin-example',
    version: '1.0.0',
}).build();

// Helper to trigger an error
function parseNotExistingDomElement(): string {
    const element = document.getElementById('not-existing-id') as HTMLElement;
    return element.outerText.split('\n')[1].toString();
}

// 1. Send handled error
document.getElementById('send-error')?.addEventListener('click', async () => {
    try {
        parseNotExistingDomElement();
    } catch (err) {
        await client.send(err as Error, { action: 'send-error' }, [
            new BacktraceStringAttachment('test.txt', 'sample attachment content'),
        ]);
    }
});

// 2. Send message
document.getElementById('send-message')?.addEventListener('click', async () => {
    await client.send('test-message', { action: 'send-message' });
});

// 3. Send unhandled exception
document.getElementById('send-unhandled-exception')?.addEventListener('click', () => {
    throw new Error('Unhandled exception from Vite plugin example');
});

// 4. Send promise rejection
document.getElementById('send-promise-rejection')?.addEventListener('click', () => {
    new Promise(() => {
        throw new Error('Promise rejection from Vite plugin example');
    });
});

console.log('Backtrace Vite Plugin Example loaded');
