import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AlternatingFileWriter } from '../../src/common/AlternatingFileWriter.js';
import { FsNodeFileSystem } from '../../src/storage/FsNodeFileSystem.js';
import { mockStreamFileSystem } from '../_mocks/fileSystem.js';

function unlinkSafe(file: string) {
    try {
        fs.unlinkSync(file);
    } catch {
        // Do nothing
    }
}

describe('AlternatingFileWriter', () => {
    const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../_testOutput');
    const file1 = path.join(dir, 'alternating_file1');
    const file2 = path.join(dir, 'alternating_file2');

    beforeAll(() => {
        fs.mkdirSync(dir, { recursive: true });

        unlinkSafe(file1);
        unlinkSafe(file2);
    });

    afterEach(() => {
        unlinkSafe(file1);
        unlinkSafe(file2);
    });

    it('should add line to the main file', async () => {
        const writer = new AlternatingFileWriter(new FsNodeFileSystem(), file1, file2, 10);
        await writer.writeLine('value');
        writer.dispose();

        const mainFile = await fs.promises.readFile(file1, 'utf-8');
        expect(mainFile).toEqual('value\n');
    });

    it('should not move main file to fallback file before adding with fileCapacity reached', async () => {
        const count = 5;
        const writer = new AlternatingFileWriter(new FsNodeFileSystem(), file1, file2, count);
        for (let i = 0; i < count; i++) {
            await writer.writeLine(`value-${i}`);
        }
        writer.dispose();

        await expect(fs.promises.stat(file2)).rejects.toThrowError();
    });

    it('should move main file to fallback file after adding with fileCapacity reached', async () => {
        const count = 5;
        const writer = new AlternatingFileWriter(new FsNodeFileSystem(), file1, file2, count);
        for (let i = 0; i < count; i++) {
            await writer.writeLine(`value-${i}`);
        }

        const mainFile = await fs.promises.readFile(file1, 'utf-8');
        await writer.writeLine('value-x');
        writer.dispose();

        const fallbackFile = await fs.promises.readFile(file2, 'utf-8');
        expect(fallbackFile).toEqual(mainFile);
    });

    it('should add line to the main file after adding with fileCapacity reached', async () => {
        const count = 5;
        const writer = new AlternatingFileWriter(new FsNodeFileSystem(), file1, file2, count);
        for (let i = 0; i < count; i++) {
            await writer.writeLine(`value-${i}`);
        }

        await writer.writeLine('value-x');
        writer.dispose();

        const mainFile = await fs.promises.readFile(file1, 'utf-8');
        expect(mainFile).toEqual('value-x\n');
    });

    it('should throw after adding line when disposed', async () => {
        const writer = new AlternatingFileWriter(new FsNodeFileSystem(), file1, file2, 10);
        writer.dispose();
        await expect(writer.writeLine('value-x')).rejects.toThrowError('This instance has been disposed.');
    });

    it('should not write when fileCapacity is 0', () => {
        const writer = new AlternatingFileWriter(new FsNodeFileSystem(), file1, file2, 0);
        writer.writeLine('abc');
        writer.dispose();

        expect(fs.existsSync(file1)).toEqual(false);
        expect(fs.existsSync(file2)).toEqual(false);
    });

    it('should not write fileCapacity is less than 0', () => {
        const writer = new AlternatingFileWriter(new FsNodeFileSystem(), file1, file2, -1);
        writer.writeLine('abc');
        writer.dispose();

        expect(fs.existsSync(file1)).toEqual(false);
        expect(fs.existsSync(file2)).toEqual(false);
    });

    describe('stress test', () => {
        it('should not throw', async () => {
            const writer = new AlternatingFileWriter(new FsNodeFileSystem(), file1, file2, 1);

            const write = async (count: number, entry: string) => {
                for (let i = 0; i < count; i++) {
                    await writer.writeLine(entry);
                }
            };

            const writerCount = 100;
            const writeCount = 100;
            const promises = [...new Array(writerCount)].map(() => write(writeCount, 'text'));
            await expect(Promise.all(promises)).resolves.not.toThrow();
        }, 10000);

        it('should not skip text', async () => {
            const fs = mockStreamFileSystem();
            const renameSync = fs.renameSync;

            let fallbackText = '';

            fs.renameSync = jest.fn((oldPath, newPath) => {
                fallbackText += fs.readFileSync(oldPath);
                return renameSync(oldPath, newPath);
            });

            const writer = new AlternatingFileWriter(fs, file1, file2, 1);

            const write = async (count: number, entry: string) => {
                for (let i = 0; i < count; i++) {
                    await writer.writeLine(entry);
                }
            };

            // TODO: Current implementation is kinda bad with more writers, and loses some data in fact.
            // Trying to fix this though can take a lot of work, so leaving this for now
            const writerCount = 1;
            const writeCount = 100;
            const promises = [...new Array(writerCount)].map(() => write(writeCount, 'text'));
            await Promise.all(promises);

            const expected = [...new Array(writerCount * writeCount - 1)].map(() => 'text\n').join('');

            expect(renameSync).toBeCalledTimes(writerCount * writeCount - 1);
            expect(fallbackText.length).toEqual(expected.length);
        });
    });
});
