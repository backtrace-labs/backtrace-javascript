import { asyncSpawn } from '../../__helpers/asyncSpawn';
import { RXID_REGEX } from '../../__helpers/rxid';
import { DIRECT_SUBMIT_URL, SUBMIT_LAYER_URL } from '../../__helpers/urls';

async function spawnNodeApp(cwd: string, url: string | URL) {
    return asyncSpawn('npm', ['run', 'start', url.toString()], { cwd, timeout: 10000 });
}

export function addSubmitTests(appPath: string) {
    describe('submit', () => {
        it('should submit an error to submit layer URL', async () => {
            const result = await spawnNodeApp(appPath, SUBMIT_LAYER_URL);
            expect(result.stdout.trim()).toMatch(RXID_REGEX);
        });

        it('should submit an error to direct submit URL', async () => {
            const result = await spawnNodeApp(appPath, DIRECT_SUBMIT_URL);
            expect(result.stdout.trim()).toMatch(RXID_REGEX);
        });

        it('should fail submitting to an invalid URL', async () => {
            const submitUrl = new URL(`http://localhost:12345`);
            await expect(() => spawnNodeApp(appPath, submitUrl)).rejects.toThrow();
        });
    });
}
