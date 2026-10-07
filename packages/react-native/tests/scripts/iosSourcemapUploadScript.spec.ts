import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const SCRIPT = path.resolve(__dirname, '../../scripts/ios-sourcemap-upload.sh');
const NODE_DIR = path.dirname(process.execPath);

interface Fixture {
    root: string;
    project: string;
    sourceMap: string;
    debugId: string;
    config: string;
    uploadLog: string;
    binDir: string;
}

interface RunOptions {
    args?: string[];
    env?: Record<string, string>;
    nodeOnPath?: boolean;
}

function resolveTool(name: string) {
    return spawnSync('/bin/sh', ['-c', `command -v ${name}`], { encoding: 'utf8' }).stdout.trim();
}

function createFixture(): Fixture {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bt-ios-sourcemap-'));
    const project = path.join(root, 'project');
    const uploadLog = path.join(root, 'upload.log');
    const binDir = path.join(root, 'bin');

    fs.mkdirSync(path.join(project, 'node_modules', '.bin'), { recursive: true });
    fs.mkdirSync(path.join(project, 'build'), { recursive: true });
    fs.mkdirSync(path.join(project, 'ios', 'Pods'), { recursive: true });
    fs.mkdirSync(binDir);
    fs.symlinkSync(resolveTool('dirname'), path.join(binDir, 'dirname'));

    fs.writeFileSync(
        path.join(project, 'node_modules', '.bin', 'backtrace-js'),
        `require('fs').writeFileSync(${JSON.stringify(uploadLog)}, JSON.stringify(process.argv.slice(2)));\n` +
            `process.exit(Number(process.env.FAKE_UPLOAD_EXIT_CODE ?? 0));\n`,
    );

    const sourceMap = path.join(project, 'main.jsbundle.map');
    const debugId = path.join(project, 'build', '.backtrace-sourcemap-id');
    const config = path.join(project, '.backtracejsrc');
    fs.writeFileSync(sourceMap, JSON.stringify({ version: 3, sources: ['a.js'], names: [], mappings: 'AAAA' }));
    fs.writeFileSync(debugId, 'test-debug-id\n');
    fs.writeFileSync(config, '{}');

    return { root, project, sourceMap, debugId, config, uploadLog, binDir };
}

function run(fixture: Fixture, { args, env, nodeOnPath = true }: RunOptions = {}) {
    const pathEntries = nodeOnPath ? [NODE_DIR, fixture.binDir] : [fixture.binDir];
    const defaultArgs = [fixture.sourceMap, fixture.debugId, fixture.config, fixture.project];
    return spawnSync('/bin/bash', [SCRIPT, ...(args ?? defaultArgs)], {
        env: { PATH: pathEntries.join(':'), ...env },
        encoding: 'utf8',
    });
}

function uploadCall(fixture: Fixture): string[] | undefined {
    return fs.existsSync(fixture.uploadLog) ? JSON.parse(fs.readFileSync(fixture.uploadLog, 'utf8')) : undefined;
}

function sourceMapDebugId(fixture: Fixture): string | undefined {
    return JSON.parse(fs.readFileSync(fixture.sourceMap, 'utf8')).debugId;
}

function writeXcodeEnv(fixture: Fixture, name: string, nodeBinary: string) {
    fs.writeFileSync(path.join(fixture.project, 'ios', name), `export NODE_BINARY="${nodeBinary}"\n`);
}

const describeOnUnix = process.platform === 'win32' ? describe.skip : describe;

describeOnUnix('ios-sourcemap-upload.sh', () => {
    let fixture: Fixture;

    beforeEach(() => {
        fixture = createFixture();
    });

    afterEach(() => {
        fs.rmSync(fixture.root, { recursive: true, force: true });
    });

    describe('outside Xcode', () => {
        it('adds the debug id to the source map and uploads it', () => {
            const result = run(fixture);

            expect(result.status).toBe(0);
            expect(sourceMapDebugId(fixture)).toBe('test-debug-id');
            expect(uploadCall(fixture)).toEqual(['upload', '-p', fixture.sourceMap, '--config', fixture.config]);
        });

        it('uses DEBUG_ID_PATH over the debug id argument', () => {
            const override = path.join(fixture.root, 'override-id');
            fs.writeFileSync(override, 'override-id');

            const result = run(fixture, { env: { DEBUG_ID_PATH: override } });

            expect(result.status).toBe(0);
            expect(sourceMapDebugId(fixture)).toBe('override-id');
        });

        it('fails when the source map does not exist', () => {
            fs.rmSync(fixture.sourceMap);

            const result = run(fixture);

            expect(result.status).toBe(1);
            expect(result.stderr).toContain('Error: Backtrace: Source map file');
            expect(uploadCall(fixture)).toBeUndefined();
        });

        it('fails when the debug id file does not exist', () => {
            fs.rmSync(fixture.debugId);

            const result = run(fixture);

            expect(result.status).toBe(1);
            expect(result.stderr).toContain('Error: Backtrace: Debug id file');
            expect(result.stderr).toContain('metro.config.js');
            expect(uploadCall(fixture)).toBeUndefined();
        });

        it('fails when arguments are missing', () => {
            const result = run(fixture, { args: [fixture.sourceMap] });

            expect(result.status).toBe(1);
            expect(result.stderr).toContain('Error: Backtrace: Missing path');
        });

        it('fails when node cannot be found', () => {
            const result = run(fixture, { nodeOnPath: false });

            expect(result.status).toBe(1);
            expect(result.stderr).toContain("Error: Backtrace: Cannot find the 'node' binary");
            expect(uploadCall(fixture)).toBeUndefined();
        });

        it('fails when the upload fails', () => {
            const result = run(fixture, { env: { FAKE_UPLOAD_EXIT_CODE: '3' } });

            expect(result.status).toBe(3);
        });
    });

    describe('in an Xcode build phase', () => {
        const release = { CONFIGURATION: 'Release', PLATFORM_NAME: 'iphoneos' };

        it('uploads on a Release build', () => {
            const result = run(fixture, { env: release });

            expect(result.status).toBe(0);
            expect(sourceMapDebugId(fixture)).toBe('test-debug-id');
            expect(uploadCall(fixture)).toEqual(['upload', '-p', fixture.sourceMap, '--config', fixture.config]);
        });

        it('uploads on a custom non-Debug configuration', () => {
            const result = run(fixture, { env: { ...release, CONFIGURATION: 'Staging' } });

            expect(result.status).toBe(0);
            expect(uploadCall(fixture)).toBeDefined();
        });

        it('skips a Debug simulator build that bundled nothing', () => {
            fs.rmSync(fixture.sourceMap);
            fs.rmSync(fixture.debugId);

            const result = run(fixture, { env: { CONFIGURATION: 'Debug', PLATFORM_NAME: 'iphonesimulator' } });

            expect(result.status).toBe(0);
            expect(result.stdout).toContain('Debug configuration produces no debug id');
            expect(result.stderr).not.toContain('warning:');
            expect(uploadCall(fixture)).toBeUndefined();
        });

        it('skips a Debug device build even though it bundled', () => {
            const result = run(fixture, { env: { CONFIGURATION: 'Debug', PLATFORM_NAME: 'iphoneos' } });

            expect(result.status).toBe(0);
            expect(sourceMapDebugId(fixture)).toBeUndefined();
            expect(uploadCall(fixture)).toBeUndefined();
        });

        it('skips configurations that contain Debug', () => {
            const result = run(fixture, { env: { ...release, CONFIGURATION: 'Debug-Staging' } });

            expect(result.status).toBe(0);
            expect(uploadCall(fixture)).toBeUndefined();
        });

        it('skips when SKIP_BUNDLING is set', () => {
            fs.rmSync(fixture.sourceMap);
            fs.rmSync(fixture.debugId);

            const result = run(fixture, { env: { ...release, SKIP_BUNDLING: '1' } });

            expect(result.status).toBe(0);
            expect(result.stdout).toContain('SKIP_BUNDLING is set');
            expect(result.stderr).not.toContain('warning:');
            expect(uploadCall(fixture)).toBeUndefined();
        });

        it('warns instead of failing when the source map is missing on a Release build', () => {
            fs.rmSync(fixture.sourceMap);

            const result = run(fixture, { env: release });

            expect(result.status).toBe(0);
            expect(result.stderr).toMatch(/^warning: Backtrace: Source map file .* SOURCEMAP_FILE/m);
            expect(uploadCall(fixture)).toBeUndefined();
        });

        it('warns instead of failing when the debug id file is missing on a Release build', () => {
            fs.rmSync(fixture.debugId);

            const result = run(fixture, { env: release });

            expect(result.status).toBe(0);
            expect(result.stderr).toMatch(/^warning: Backtrace: Debug id file .* metro\.config\.js/m);
            expect(uploadCall(fixture)).toBeUndefined();
        });

        it('names the Archive case when the debug id file is only in CONFIGURATION_BUILD_DIR', () => {
            const targetBuildDir = path.join(fixture.root, 'Applications');
            fs.mkdirSync(targetBuildDir);

            const result = run(fixture, {
                args: [
                    fixture.sourceMap,
                    path.join(targetBuildDir, '.backtrace-sourcemap-id'),
                    fixture.config,
                    fixture.project,
                ],
                env: { ...release, CONFIGURATION_BUILD_DIR: path.dirname(fixture.debugId) },
            });

            expect(result.status).toBe(0);
            expect(result.stderr).toMatch(/^warning: Backtrace: Debug id file .* Product > Archive/m);
            expect(result.stderr).toContain('Pass $CONFIGURATION_BUILD_DIR/.backtrace-sourcemap-id');
            expect(uploadCall(fixture)).toBeUndefined();
        });

        it('keeps the serializer hint when CONFIGURATION_BUILD_DIR has no debug id file either', () => {
            fs.rmSync(fixture.debugId);

            const result = run(fixture, {
                env: { ...release, CONFIGURATION_BUILD_DIR: path.dirname(fixture.debugId) },
            });

            expect(result.status).toBe(0);
            expect(result.stderr).toMatch(/^warning: Backtrace: Debug id file .* metro\.config\.js/m);
            expect(result.stderr).not.toContain('Archive');
            expect(uploadCall(fixture)).toBeUndefined();
        });

        it('warns instead of failing when the configuration file is missing', () => {
            fs.rmSync(fixture.config);

            const result = run(fixture, { env: release });

            expect(result.status).toBe(0);
            expect(result.stderr).toMatch(/^warning: Backtrace: Configuration file/m);
            expect(uploadCall(fixture)).toBeUndefined();
        });

        it('warns instead of failing when backtrace-js is not installed', () => {
            fs.rmSync(path.join(fixture.project, 'node_modules', '.bin', 'backtrace-js'));

            const result = run(fixture, { env: release });

            expect(result.status).toBe(0);
            expect(result.stderr).toMatch(/^warning: Backtrace: backtrace-js not found/m);
            expect(sourceMapDebugId(fixture)).toBeUndefined();
        });

        it('takes NODE_BINARY from ios/.xcode.env when node is not on PATH', () => {
            writeXcodeEnv(fixture, '.xcode.env', process.execPath);

            const result = run(fixture, {
                env: { ...release, PODS_ROOT: path.join(fixture.project, 'ios', 'Pods') },
                nodeOnPath: false,
            });

            expect(result.status).toBe(0);
            expect(uploadCall(fixture)).toBeDefined();
        });

        it('lets ios/.xcode.env.local override ios/.xcode.env', () => {
            writeXcodeEnv(fixture, '.xcode.env', '/nonexistent/node');
            writeXcodeEnv(fixture, '.xcode.env.local', process.execPath);

            const result = run(fixture, {
                env: { ...release, PODS_ROOT: path.join(fixture.project, 'ios', 'Pods') },
                nodeOnPath: false,
            });

            expect(result.status).toBe(0);
            expect(uploadCall(fixture)).toBeDefined();
        });

        it('prefers an explicit NODE_BINARY over ios/.xcode.env', () => {
            writeXcodeEnv(fixture, '.xcode.env', '/nonexistent/node');

            const result = run(fixture, {
                env: {
                    ...release,
                    PODS_ROOT: path.join(fixture.project, 'ios', 'Pods'),
                    NODE_BINARY: process.execPath,
                },
                nodeOnPath: false,
            });

            expect(result.status).toBe(0);
            expect(uploadCall(fixture)).toBeDefined();
        });

        it('warns instead of failing when node cannot be found', () => {
            const result = run(fixture, { env: release, nodeOnPath: false });

            expect(result.status).toBe(0);
            expect(result.stderr).toMatch(/^warning: Backtrace: Cannot find the 'node' binary/m);
            expect(uploadCall(fixture)).toBeUndefined();
        });

        it('still fails the build when the upload fails', () => {
            const result = run(fixture, { env: { ...release, FAKE_UPLOAD_EXIT_CODE: '3' } });

            expect(result.status).toBe(3);
        });
    });
});
