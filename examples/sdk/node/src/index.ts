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
        'complex-attribute': {
            prop1: true,
            prop2: 123,
        },
    },
}).build();

console.log(
    `Welcome in the Backtrace demo. Please pick one of available options
    1. Send an exception
    2. Send a message

    0. Exit`,
);

function showMenu() {
    reader.question('Select the option... \n', async function executeUserOption(optionString: string) {
        const option = parseInt(optionString);
        if (isNaN(option)) {
            console.error('Selected invalid option');
            return exit(1);
        }
        const attributes = { selectedOption: option };

        switch (option) {
            case 1: {
                try {
                    fs.readFileSync('/path/to/not/existing/file');
                } catch (err) {
                    await client.send(err as Error, attributes);
                }
                break;
            }
            case 2: {
                await client.send('test message', attributes);
                break;
            }
            case 0: {
                reader.close();
                return exit(0);
            }
            default: {
                console.log('Selected unrecognized option. Please try again.');
            }
        }
        return showMenu();
    });
}

showMenu();
