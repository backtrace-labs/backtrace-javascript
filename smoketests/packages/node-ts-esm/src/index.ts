import { BacktraceClient } from '@backtrace/node';
import { BacktraceReportSubmissionResult, BacktraceSubmissionResponse } from '@backtrace/sdk-core';
import fs from 'fs/promises';
import path from 'path';

const DATABASE_TEST = 'test-database';
const DATABASE_PATH = path.join(process.cwd(), 'database');

const TIMEOUT = 5000;
const [SUBMISSION_URL, TEST] = process.argv.slice(2);
if (!SUBMISSION_URL) {
    throw new Error('submission URL is required');
}

// If current test is not a database test, clean the database
// to avoid invalid results
if (TEST !== DATABASE_TEST) {
    await fs.rm(DATABASE_PATH, { force: true, recursive: true });
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
        path: DATABASE_PATH,
        captureNativeCrashes: true,
        createDatabaseDirectory: true,
    },
});

function waitForSend(timeout: number) {
    return new Promise<BacktraceReportSubmissionResult<BacktraceSubmissionResponse>>((resolve, reject) => {
        let resolved = false;
        client.once('after-send', (data, attachments, result) => {
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
    const waitPromise = waitForSend(TIMEOUT);
    const result = (await fn()) ?? (await waitPromise);
    if (result.status === 'Ok') {
        console.log(result.result?._rxid);
        process.exit(0);
    } else {
        console.error('Unexpected result:', result);
        process.exit(1);
    }
}

console.log(`running test ${TEST}`);
switch (TEST ?? 'test-exception') {
    case DATABASE_TEST: {
        await test(() => {
            // do nothing, expect database to send something
        });
        break;
    }
    case 'test-unhandled-exception':
        await test(() => {
            setTimeout(() => {
                throw new Error('unhandled exception');
            }, 10);
        });
        break;
    case 'test-unhandled-rejection':
        await test(() => {
            new Promise((_, reject) => reject(new Error('unhandled rejection')));
        });
        break;
    case 'test-message':
        await test(() => client.send('test message'));
        break;
    case 'test-exception':
        await test(() => client.send(new Error('test exception')));
        break;
    default:
        throw new Error(`unknown test ${TEST}`);
}
