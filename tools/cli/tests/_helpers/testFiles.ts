import assert from 'assert';
import crypto, { randomBytes } from 'crypto';
import fs from 'fs';
import fsExtra from 'fs-extra';
import path from 'path';

export type TestFiles =
    | 'no-sourcemaps'
    | 'not-linked-sourcemaps'
    | 'not-linked-different-name-sourcemaps'
    | 'directory-linked-sourcemaps'
    | 'processed-not-linked-sourcemaps'
    | 'processed-not-linked-different-name-sourcemaps'
    | 'processed-directory-linked-sourcemaps'
    | 'original'
    | 'processed'
    | 'processed-sources'
    | 'processed-sourcemaps'
    | 'processed-with-sources'
    | 'with-sources'
    | 'invalid';

export const TEST_FILE_DIR = path.join(__dirname, '../_files');

function createWorkingCopy(source: TestFiles, outputDir: string) {
    const sourceDir = path.join(TEST_FILE_DIR, source);
    fsExtra.copySync(sourceDir, outputDir);
}

export function withWorkingCopy(sources: TestFiles | TestFiles[], fn: (path: string) => void | Promise<void>) {
    return async function _withWorkingCopy() {
        const workingCopy = path.join(TEST_FILE_DIR, `_working-copy-${randomBytes(4).toString('hex')}`);

        if (Array.isArray(sources)) {
            for (const source of sources) {
                createWorkingCopy(source, workingCopy);
            }
        } else {
            createWorkingCopy(sources, workingCopy);
        }

        try {
            await fn(workingCopy);
        } finally {
            fs.rmSync(workingCopy, { recursive: true, force: true });
        }
    };
}
export async function hashFiles(files: string[]) {
    const hashes = await Promise.all(files.map(hashFile));

    const hash = crypto.createHash('sha1');
    return hashes.reduce((hasher, hash) => hasher.update(hash), hash).digest('hex');
}

export async function hashFile(file: string) {
    const hash = crypto.createHash('sha1').setEncoding('hex');
    const fd = fs.createReadStream(file);

    const endPromise = new Promise((resolve) => fd.on('end', resolve));

    fd.pipe(hash);
    await endPromise;
    return hash.read() as string;
}

export async function hashEachFile(files: string[]): Promise<Record<string, string>> {
    return Object.fromEntries(await Promise.all(files.map(async (file) => [file, await hashFile(file)] as const)));
}

export function expectHashesToChange(hashes1: Record<string, string>, hashes2: Record<string, string>) {
    for (const key in hashes1) {
        assert(hashes1[key]);
        assert(hashes2[key]);

        expect(hashes2[key]).not.toEqual(hashes1[key]);
    }
}

export async function readEachFile(files: string[]): Promise<Record<string, string>> {
    return Object.fromEntries(
        await Promise.all(files.map(async (file) => [file, await fs.promises.readFile(file, 'utf-8')] as const)),
    );
}
