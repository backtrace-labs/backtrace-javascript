import path from 'path';
import { FileFinder } from '../src';

describe('FileFinder', () => {
    it('should return files in directory', async () => {
        const finder = new FileFinder();

        const result = await finder.find(path.join(__dirname, './testFiles'));

        expect(result).toContain(path.resolve(__dirname, './testFiles', 'source.js'));
        expect(result).toContain(path.resolve(__dirname, './testFiles', 'source.js.map'));
    });

    it('should return matching files in directory', async () => {
        const finder = new FileFinder();

        const result = await finder.find(path.join(__dirname, './testFiles'), { match: /\.map$/ });

        expect(result).toContain(path.resolve(__dirname, './testFiles', 'source.js.map'));
        expect(result).not.toContain(expect.not.stringMatching(/\.map$/));
    });

    it('should return files in subdirectories in recursive mode', async () => {
        const finder = new FileFinder();

        const result = await finder.find(path.join(__dirname, './'), { recursive: true });

        expect(result).toContain(path.resolve(__dirname, './testFiles', 'source.js'));
        expect(result).toContain(path.resolve(__dirname, './testFiles', 'source.js.map'));
    });

    it('should not return files in subdirectories in non recursive mode', async () => {
        const finder = new FileFinder();

        const result = await finder.find(path.join(__dirname, './'));

        expect(result).not.toContain(path.resolve(__dirname, './testFiles', 'source.js'));
        expect(result).not.toContain(path.resolve(__dirname, './testFiles', 'source.js.map'));
    });

    it('should not return directories', async () => {
        const finder = new FileFinder();

        const result = await finder.find(path.join(__dirname, './'));

        expect(result).not.toContain(path.resolve(__dirname, './testFiles'));
    });

    it('should not return directories in recursive mode', async () => {
        const finder = new FileFinder();

        const result = await finder.find(path.join(__dirname, './'), { recursive: true });

        expect(result).not.toContain(path.resolve(__dirname, './testFiles'));
    });
});
