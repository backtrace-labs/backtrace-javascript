import path from 'path';
import { PACKAGE_DIR } from '../../__helpers/packages.js';
import { addCrashAndSubmitTests, addSubmitTests } from './tests.js';

const NODE_APP_PATH = path.join(PACKAGE_DIR, 'node-ts-esm');

describe('node-ts-esm', () => {
    addSubmitTests(NODE_APP_PATH, 'test-message');
    addSubmitTests(NODE_APP_PATH, 'test-exception');
    addCrashAndSubmitTests(NODE_APP_PATH, 'test-unhandled-exception');
    addCrashAndSubmitTests(NODE_APP_PATH, 'test-unhandled-rejection');
});
