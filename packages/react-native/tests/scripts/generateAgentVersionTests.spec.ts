import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

describe('agent version generation', () => {
    let root: string;
    let script: string;
    let target: string;

    beforeEach(() => {
        root = fs.mkdtempSync(path.join(os.tmpdir(), 'backtrace-agent-version-'));
        script = path.join(root, 'scripts/generate-agent-version.cjs');
        target = path.join(root, 'src/common/agentVersion.ts');
        fs.mkdirSync(path.dirname(script));
        fs.copyFileSync(path.resolve(__dirname, '../../scripts/generate-agent-version.cjs'), script);
        fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ version: '1.2.3-rc.4' }));
    });

    afterEach(() => {
        fs.rmSync(root, { recursive: true, force: true });
    });

    const run = (...args: string[]) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });

    it('generates a version module and leaves matching files untouched', () => {
        expect(run().status).toBe(0);
        expect(fs.readFileSync(target, 'utf8')).toContain("export const agentVersion = '1.2.3-rc.4';");
        const before = fs.statSync(target).mtimeMs;
        expect(run().status).toBe(0);
        expect(run('--check').status).toBe(0);
        expect(fs.statSync(target).mtimeMs).toBe(before);
    });

    it('detects missing and stale modules without changing them in check mode', () => {
        expect(run('--check').status).not.toBe(0);
        expect(fs.existsSync(target)).toBe(false);
        expect(run().status).toBe(0);
        const before = fs.readFileSync(target, 'utf8');
        fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ version: '1.2.3' }));
        expect(run('--check').status).not.toBe(0);
        expect(fs.readFileSync(target, 'utf8')).toBe(before);
        expect(run().status).toBe(0);
        expect(fs.readFileSync(target, 'utf8')).toContain("export const agentVersion = '1.2.3';");
    });

    it.each([undefined, 123, "1.2.3'; throw new Error('injected')", 'not-a-version'])(
        'rejects unsafe or missing version metadata: %s',
        (version) => {
            fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ version }));
            expect(run().status).not.toBe(0);
            expect(fs.existsSync(target)).toBe(false);
        },
    );

    it('rejects unknown arguments without writing a module', () => {
        expect(run('--unknown').status).not.toBe(0);
        expect(run('--check', '--check').status).not.toBe(0);
        expect(fs.existsSync(target)).toBe(false);
    });
});
