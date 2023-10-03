import fs from 'fs';
import path from 'path';
import { AlternatingFileWriter } from '../../src/common/AlternatingFileWriter';

function unlinkSafe(file: string) {
    try {
        fs.unlinkSync(file);
    } catch {
        // Do nothing
    }
}

describe('AlternatingFileWriter', () => {
    const dir = path.join(__dirname, '../_testOutput');
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
        const writer = new AlternatingFileWriter(file1, file2, 10);
        await writer.writeLine('value');
        writer.dispose();

        const mainFile = await fs.promises.readFile(file1, 'utf-8');
        expect(mainFile).toEqual('value\n');
    });

    it('should not move main file to fallback file before adding with fileCapacity reached', async () => {
        const count = 5;
        const writer = new AlternatingFileWriter(file1, file2, count);
        for (let i = 0; i < count; i++) {
            await writer.writeLine(`value-${i}`);
        }
        writer.dispose();

        await expect(fs.promises.stat(file2)).rejects.toThrowError();
    });

    it('should move main file to fallback file after adding with fileCapacity reached', async () => {
        const count = 5;
        const writer = new AlternatingFileWriter(file1, file2, count);
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
        const writer = new AlternatingFileWriter(file1, file2, count);
        for (let i = 0; i < count; i++) {
            await writer.writeLine(`value-${i}`);
        }

        await writer.writeLine('value-x');
        writer.dispose();

        const mainFile = await fs.promises.readFile(file1, 'utf-8');
        expect(mainFile).toEqual('value-x\n');
    });

    it('should throw after adding line when disposed', async () => {
        const writer = new AlternatingFileWriter(file1, file2, 10);
        writer.dispose();
        await expect(writer.writeLine('value-x')).rejects.toThrowError('This instance has been disposed.');
    });

    it('should throw when fileCapacity is 0', () => {
        expect(() => new AlternatingFileWriter(file1, file2, 0)).toThrowError(
            'File capacity may not be less or equal to 0.',
        );
    });

    it('should throw when fileCapacity is less than 0', () => {
        expect(() => new AlternatingFileWriter(file1, file2, -1)).toThrowError(
            'File capacity may not be less or equal to 0.',
        );
    });
});
