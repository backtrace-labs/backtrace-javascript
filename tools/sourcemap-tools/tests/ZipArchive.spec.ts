import assert from 'assert';
import decompress from 'decompress';
import fs from 'fs';
import path from 'path';
import { ZipArchive } from '../src';

describe('ZipArchive', () => {
    const outputFile = path.join(__dirname, './testOutput/archive.zip');

    beforeEach(async () => {
        try {
            await fs.promises.unlink(outputFile);
        } catch {
            // Do nothing
        }
    });

    it('should create a zip archive', async () => {
        const archive = new ZipArchive();
        const outputStream = fs.createWriteStream(outputFile);
        archive.pipe(outputStream);

        const entries = [
            ['entry1', Buffer.from('entry1')],
            ['entry2', Buffer.from('entry2')],
        ] as const;

        for (const [name, buf] of entries) {
            archive.append(name, buf);
        }

        await archive.finalize();

        const files = await decompress(outputFile);
        expect(files.length).toBeGreaterThan(0);

        for (const file of files) {
            const entry = entries.find(([e]) => e === file.path);
            assert(entry);

            expect(entry[1]).toEqual(file.data);
        }
    });
});
