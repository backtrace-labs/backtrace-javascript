import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { Readable } from 'stream';
import { waitForData, waitForUrl } from './waitFor.js';

async function waitForPort(stdout: Readable) {
    const regex = /localhost:(\d+)/;
    const [, port] = await waitForData(stdout, regex);
    return parseInt(port, 10);
}

export function useServeDirectory(dir: string) {
    let serveProcess: ChildProcessWithoutNullStreams;
    let port: number | undefined;

    beforeAll(async () => {
        serveProcess = spawn('npx', ['serve', dir]);
        serveProcess.stdout.on('data', (chunk) => console.log(`http-server:`, chunk.toString('utf-8')));
        serveProcess.stderr.on('data', (chunk) => console.log(`http-server:`, chunk.toString('utf-8')));

        port = await waitForPort(serveProcess.stdout);

        await waitForUrl(`http://localhost:${port}`);
        console.log(`serving ${dir} on ${port}`);
    });

    afterAll(async () => {
        console.log(`stopping ${dir} serve on port ${port}`);
        serveProcess.kill('SIGKILL');
    });

    return () => {
        if (port === undefined) {
            throw new Error('directory is not being served');
        }

        return port;
    };
}
