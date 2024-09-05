import path from 'path';
import { useNpmApp } from '../__helpers/npm';
import { addSubmitTests } from './tests';

const NODE_APP_PATH = path.join(__dirname, '../../node-js-cjs');

describe('node-js-cjs', () => {
    useNpmApp(NODE_APP_PATH);
    addSubmitTests(NODE_APP_PATH);
});
