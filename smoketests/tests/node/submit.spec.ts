import path from 'path';
import { asyncSpawn } from '../__helpers/asyncSpawn';
import { setupNpmApp } from '../__helpers/npm';
import { randomToken } from '../__helpers/token';
import { useFakeCoroner } from '../fake-coroner/fixture';
import { getLastRequests } from '../fake-coroner/lastRequests';

const NODE_APP_PATH = path.join(__dirname, '../../node');

describe('node submit', () => {
    useFakeCoroner();

    beforeAll(async () => {
        await setupNpmApp(NODE_APP_PATH);
    });

    function spawnNodeApp(url: string | URL) {
        return asyncSpawn('node', ['lib/index.js', url.toString()], { cwd: NODE_APP_PATH, timeout: 10000 });
    }

    it('should submit an error to HTTP submit layer', async () => {
        const submitUrl = new URL(`http://submit.backtrace.io/node/${randomToken()}/json`);

        await spawnNodeApp(submitUrl);

        const [lastRequest] = await getLastRequests(1);
        expect(lastRequest?.url).toEqual(submitUrl.pathname);
    });

    it('should submit an error to HTTPS submit layer', async () => {
        const submitUrl = new URL(`https://submit.backtrace.io/node/${randomToken()}/json`);

        await spawnNodeApp(submitUrl);

        const [lastRequest] = await getLastRequests(1);
        expect(lastRequest?.url).toEqual(submitUrl.pathname);
    });

    it('should submit an error to direct HTTP submission', async () => {
        const submitUrl = new URL(`http://smoketest.sp.backtrace.io:6097/post?token=${randomToken()}&format=json`);

        await spawnNodeApp(submitUrl);

        const [lastRequest] = await getLastRequests(1);
        expect(lastRequest?.url).toEqual(submitUrl.pathname + submitUrl.search);
    });

    it('should submit an error to direct HTTPS submission', async () => {
        const submitUrl = new URL(`https://smoketest.sp.backtrace.io:6098/post?token=${randomToken()}&format=json`);

        await spawnNodeApp(submitUrl);

        const [lastRequest] = await getLastRequests(1);
        expect(lastRequest?.url).toEqual(submitUrl.pathname + submitUrl.search);
    });

    it('should fail submitting to an invalid URL', async () => {
        const submitUrl = new URL(`http://localhost:12345`);

        await expect(() => spawnNodeApp(submitUrl)).rejects.toThrow();
    });
});
