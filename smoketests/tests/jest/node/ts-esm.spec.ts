import path from 'path';
import { useNpmApp } from '../../__helpers/npm';
import { addSubmitTests } from './tests';

const NODE_APP_PATH = path.join(__dirname, '../../../node-ts-esm');

describe('node-ts-esm', () => {
    useNpmApp(NODE_APP_PATH, ['build']);
    addSubmitTests(NODE_APP_PATH);
});