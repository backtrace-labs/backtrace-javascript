import { BacktraceClient, BacktraceStringAttachment } from '@backtrace/browser';
import { SUBMISSION_URL } from './consts';

const client = BacktraceClient.builder({
    url: SUBMISSION_URL,
    name: '@backtrace/browser-example',
    version: '0.0.1',
    userAttributes: {
        'custom-attribute': 'test',
        'custom-annotation': {
            prop1: true,
            prop2: 123,
        },
    },
}).build();

function parseNotExistingDomElement(): string {
    const element = document.getElementById('not-existing-id') as HTMLElement;
    return element.outerText.split('\n')[1].toString();
}

const sendErrorButton = document.getElementById('send-error') as HTMLElement;
const sendMessageButton = document.getElementById('send-message') as HTMLElement;

sendErrorButton.onclick = async () => {
    try {
        console.log('send-error click');
        parseNotExistingDomElement();
    } catch (err) {
        await client.send(err as Error, { action: 'send-error' }, [
            new BacktraceStringAttachment('test.txt', 'sample attachment content'),
        ]);
    }
};

sendMessageButton.onclick = async () => {
    console.log('send-message click');
    await client.send('test-message', { action: 'send-message' }, [
        new BacktraceStringAttachment('test.txt', 'sample attachment content'),
    ]);
};
