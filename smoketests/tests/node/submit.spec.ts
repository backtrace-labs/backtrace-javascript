import assert from 'assert';
import path from 'path';
import { asyncSpawn } from '../__helpers/asyncSpawn';
import { setupNpmApp } from '../__helpers/npm';

const NODE_APP_PATH = path.join(__dirname, '../../node');

const SUBMIT_LAYER_URL = process.env.SMOKETESTS_SUBMIT_LAYER_URL;
const DIRECT_SUBMIT_URL = process.env.SMOKETESTS_DIRECT_SUBMIT_URL;

const RXID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

describe('node submit', () => {
    beforeAll(async () => {
        await setupNpmApp(NODE_APP_PATH);
    });

    function spawnNodeApp(url: string | URL) {
        return asyncSpawn('node', ['lib/index.js', url.toString()], { cwd: NODE_APP_PATH, timeout: 10000 });
    }

    it('should submit an error to submit layer URL', async () => {
        assert(SUBMIT_LAYER_URL);
        const result = await spawnNodeApp(SUBMIT_LAYER_URL);
        expect(result.stdout.trim()).toMatch(RXID_REGEX);
    });

    it('should submit an error to direct submit URL', async () => {
        assert(DIRECT_SUBMIT_URL);
        const result = await spawnNodeApp(DIRECT_SUBMIT_URL);
        expect(result.stdout.trim()).toMatch(RXID_REGEX);
    });

    it('should fail submitting to an invalid URL', async () => {
        const submitUrl = new URL(`http://localhost:12345`);
        await expect(() => spawnNodeApp(submitUrl)).rejects.toThrow();
    });
});
