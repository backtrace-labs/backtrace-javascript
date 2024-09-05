import path from 'path';
import { useNpmApp } from '../../__helpers/npm';
import { addSubmitTests } from './tests';

const NODE_APP_PATH = path.join(__dirname, '../../../node-ts-cjs');

describe('node-ts-cjs', () => {
    useNpmApp(NODE_APP_PATH, ['build']);
    addSubmitTests(NODE_APP_PATH);
});
