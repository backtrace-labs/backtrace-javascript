import path from 'path';
import { PACKAGE_DIR } from '../../__helpers/packages.js';
import { addSubmitTests } from './tests.js';

const NODE_APP_PATH = path.join(PACKAGE_DIR, 'node-js-cjs');

describe('node-js-cjs', () => {
    addSubmitTests(NODE_APP_PATH);
});
