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

const client = BacktraceClient.builder({
    url: SUBMISSION_URL,
    attachments: [path.join(path.dirname(process.cwd()), 'samplefile.txt')],
    rateLimit: 5,
    userAttributes: {
        'custom-attribute': 'test',
        'custom-annotation': {
            prop1: true,
            prop2: 123,
        },
    },
}).build();

console.log('Welcome to the @Backtrace/node demo');
const menu = `Please pick one of available options:
1. Send an exception
2. Send a message
0. Exit
    
Type the option number:`;

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

function showMenu() {
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
