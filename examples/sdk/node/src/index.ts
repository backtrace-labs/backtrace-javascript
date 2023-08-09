import { BacktraceClient } from '@backtrace/node';
import fs from 'fs';
import path from 'path';
import { exit } from 'process';
import readline from 'readline';
import { SUBMISSION_URL } from './consts';
const reader = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const client = BacktraceClient.initialize({
    url: SUBMISSION_URL,
    attachments: [path.join(process.cwd(), 'samplefile.txt')],
    rateLimit: 5,
    userAttributes: {
        'custom-attribute': 'test',
        'custom-annotation': {
            prop1: true,
            prop2: 123,
        },
    },
    database: {
        enabled: true,
        path: path.join(process.cwd(), 'database'),
    },
});

console.log('Welcome to the @Backtrace/node demo');

async function sendHandledException(attributes: Record<string, number>) {
    console.log('Sending an error to Backtrace');
    try {
        fs.readFileSync('/path/to/not/existing/file');
    } catch (err) {
        await client.send(err as Error, attributes);
    }
}

async function sendMessage(message: string, attributes: Record<string, number>) {
    console.log('Sending a text message to Backtrace');
    await client.send(message, attributes);
}

async function rejectPromise(message: string) {
    return new Promise(() => {
        console.log('Rejecting promise without .catch and finally.');
        throw new Error(message);
    });
}

function addEvent(name: string, attributes: Record<string, number>) {
    if (!client.metrics) {
        console.log('metrics are unavailable');
        return;
    }
    client.metrics.addSummedEvent(name, attributes);
}
function sendMetrics() {
    if (!client.metrics) {
        console.log('metrics are unavailable');
        return;
    }
    client.metrics.send();
}
function showMenu() {
    const menu =
        `Please pick one of available options:\n` +
        `1. Send an exception\n` +
        `2. Send a message\n` +
        `3. Throw rejected promise\n` +
        `4. Add a new summed event\n` +
        `5. Send all metrics\n` +
        `0. Exit\n` +
        `Type the option number:`;
    reader.question(menu, async function executeUserOption(optionString: string) {
        const option = parseInt(optionString);

        const attributes = { selectedOption: option };

        switch (option) {
            case 1: {
                await sendHandledException(attributes);
                break;
            }
            case 2: {
                await sendMessage('test message', attributes);
                break;
            }
            case 3: {
                rejectPromise('Rejected promise');
                break;
            }
            case 4: {
                addEvent('Option clicked', attributes);
                break;
            }
            case 5: {
                sendMetrics();
                break;
            }
            case 0: {
                reader.close();
                return exit(0);
            }
            default: {
                console.log('Selected invalid option. Please try again.');
            }
        }
        return showMenu();
    });
}

showMenu();
