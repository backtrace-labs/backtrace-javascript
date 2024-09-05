import path from 'path';
import { useNpmApp } from '../../__helpers/npm';
import { addSubmitTests } from './tests';

const NODE_APP_PATH = path.join(__dirname, '../../../node-js-esm');

describe('node-js-esm', () => {
    useNpmApp(NODE_APP_PATH);
    addSubmitTests(NODE_APP_PATH);
});
