import { npm } from '../../__helpers/npm.js';
import { RXID_REGEX } from '../../__helpers/rxid.js';
import { DIRECT_SUBMIT_URL, SUBMIT_LAYER_URL } from '../../__helpers/urls.js';

async function spawnNodeApp(cwd: string, url: string | URL, test?: string) {
    const args = ['run', 'start', url.toString()];
    if (test) {
        args.push(test);
    }

    return npm(cwd, args, { timeout: 10000 });
}

function getRxid(stdout: string) {
    return stdout.trim().split('\n').slice(-1)[0];
}

export function addSubmitTests(appPath: string, test = 'test-exception') {
    describe(test, () => {
        it('should submit an error to submit layer URL', async () => {
            const result = await spawnNodeApp(appPath, SUBMIT_LAYER_URL, test);
            expect(getRxid(result.stdout)).toMatch(RXID_REGEX);
        });

        it('should submit an error to direct submit URL', async () => {
            const result = await spawnNodeApp(appPath, DIRECT_SUBMIT_URL, test);
            expect(getRxid(result.stdout)).toMatch(RXID_REGEX);
        });

        it('should fail submitting to an invalid URL', async () => {
            const submitUrl = new URL(`http://localhost:12345`);
            await expect(() => spawnNodeApp(appPath, submitUrl)).rejects.toThrow();
        });
    });
}

export function addCrashAndSubmitTests(appPath: string, test = 'test-unhandled-exception') {
    describe(test, () => {
        it('should submit an error to submit layer URL', async () => {
            await expect(spawnNodeApp(appPath, SUBMIT_LAYER_URL, test)).rejects.toThrowError();

            const result = await spawnNodeApp(appPath, SUBMIT_LAYER_URL, 'test-database');
            expect(getRxid(result.stdout)).toMatch(RXID_REGEX);
        });

        it('should submit an error to direct submit URL', async () => {
            await expect(spawnNodeApp(appPath, DIRECT_SUBMIT_URL, test)).rejects.toThrowError();

            const result = await spawnNodeApp(appPath, DIRECT_SUBMIT_URL, 'test-database');
            expect(getRxid(result.stdout)).toMatch(RXID_REGEX);
        });
    });
}
