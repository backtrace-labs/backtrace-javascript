import { BacktraceClient, BreadcrumbLogLevel } from '@backtrace/node';
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
        enable: true,
        path: path.join(process.cwd(), 'database'),
        captureNativeCrashes: true,
        createDatabaseDirectory: true,
    },
});

console.log('Welcome to the @backtrace/node demo');

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
function addBreadcrumb(message: string, attributes: Record<string, number>) {
    if (!client.breadcrumbs) {
        console.log('breadcrumbs are not available');
        return;
    }
    client.breadcrumbs.log(message, BreadcrumbLogLevel.Info, attributes);
}

function oom() {
    function allocateMemory(size: number) {
        const numbers = size / 8;
        const arr = [];
        arr.length = numbers;
        for (let i = 0; i < numbers; i++) {
            arr[i] = i;
        }
        return arr;
    }

    const TIME_INTERVAL_IN_MSEC = 40;
    const memoryLeakAllocations = [];

    console.log('This may take a while dependning on Node memory limits.');
    console.log('For best results, start with --max-old-space-size set to a low value, like 100.');
    console.log('e.g. node --max-old-space-size=100 lib/index.js');
    setInterval(() => {
        const allocation = allocateMemory(10 * 1024 * 1024);
        memoryLeakAllocations.push(allocation);
    }, TIME_INTERVAL_IN_MSEC);

    return new Promise(() => {
        // Never resolve
    });
}

function showMenu() {
    const options = [
        ['Send an exception', (attributes: Record<string, number>) => sendHandledException(attributes)],
        ['Send a message', (attributes: Record<string, number>) => sendMessage('test message', attributes)],
        ['Throw rejected promise', () => rejectPromise('Rejected promise')],
        ['OOM', oom],
        ['Add a new summed event', (attributes: Record<string, number>) => addEvent('Option clicked', attributes)],
        ['Add a breadcrumb', (attributes: Record<string, number>) => addBreadcrumb('Breadcrumb added', attributes)],
        ['Add random attribute', () => client.addAttribute({ random: Math.random() })],
        ['Send all metrics', sendMetrics],
    ] as const;

    const menu =
        `Please pick one of available options:\n` +
        options.map(([name], i) => `${i + 1}. ${name}`).join('\n') +
        '\n' +
        `0. Exit\n` +
        `Type the option number:`;

    reader.question(menu, async function executeUserOption(optionString: string) {
        const option = parseInt(optionString);

        const attributes = { selectedOption: option };

        switch (option) {
            case 0: {
                reader.close();
                return exit(0);
            }
            default: {
                const selected = options[option - 1];
                if (selected) {
                    await selected[1](attributes);
                } else {
                    console.log('Selected invalid option. Please try again.');
                }
            }
        }
        return showMenu();
    });
}

showMenu();
