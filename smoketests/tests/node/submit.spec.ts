import path from 'path';
import { asyncSpawn } from '../__helpers/asyncSpawn';
import { setupNpmApp } from '../__helpers/npm';
import { DIRECT_SUBMIT_URL, SUBMIT_LAYER_URL } from '../__helpers/urls';

const NODE_APP_PATH = path.join(__dirname, '../../node');

const RXID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

describe('node submit', () => {
    beforeAll(async () => {
        await setupNpmApp(NODE_APP_PATH);
    });

    function spawnNodeApp(url: string | URL) {
        return asyncSpawn('node', ['lib/index.js', url.toString()], { cwd: NODE_APP_PATH, timeout: 10000 });
    }

    it('should submit an error to submit layer URL', async () => {
        const result = await spawnNodeApp(SUBMIT_LAYER_URL);
        expect(result.stdout.trim()).toMatch(RXID_REGEX);
    });

    it('should submit an error to direct submit URL', async () => {
        const result = await spawnNodeApp(DIRECT_SUBMIT_URL);
        expect(result.stdout.trim()).toMatch(RXID_REGEX);
    });

    it('should fail submitting to an invalid URL', async () => {
        const submitUrl = new URL(`http://localhost:12345`);
        await expect(() => spawnNodeApp(submitUrl)).rejects.toThrow();
    });
});
