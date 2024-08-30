import { BacktraceClient } from '@backtrace/node';
import path from 'path';

const SUBMISSION_URL = process.argv[2];
if (!SUBMISSION_URL) {
    throw new Error('submission URL is required');
}

console.log('initializing BacktraceClient');
const client = BacktraceClient.initialize({
    url: SUBMISSION_URL,
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

console.log('submitting message');
client.send('test message').then((result) => {
    if (result.status !== 'Ok') {
        console.error('Unexpected result:', result);
        process.exit(1);
    }

    console.log('submission ok');
    process.exit(0);
});
