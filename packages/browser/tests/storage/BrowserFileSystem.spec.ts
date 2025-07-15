import { BrowserFileSystem } from '../../src/storage/BrowserFileSystem.js';

describe('BrowserFileSystem', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    describe('readDir', () => {
        it('should return all values in path', () => {
            localStorage.setItem('backtrace__/dir/1', 'test');
            localStorage.setItem('backtrace__/dir/2', 'test');

            const fs = new BrowserFileSystem(localStorage);
            const files = fs.readDirSync('dir');
            expect(files).toEqual(['1', '2']);
        });

        it('should return all values in absolute path', () => {
            localStorage.setItem('backtrace__/dir1/dir2/1', 'test');
            localStorage.setItem('backtrace__/dir1/dir2/2', 'test');

            const fs = new BrowserFileSystem(localStorage);
            const files = fs.readDirSync('/dir1/dir2/');
            expect(files).toEqual(['1', '2']);
        });

        it('should return no values for non-existing keys', () => {
            const fs = new BrowserFileSystem(localStorage);
            const files = fs.readDirSync('/dir1/dir2/');
            expect(files).toEqual([]);
        });

        it('should not return values not prefixed by backtrace__', () => {
            localStorage.setItem('test__/dir1/dir2/1', 'test');
            localStorage.setItem('backtrace__/dir1/dir2/2', 'test');

            const fs = new BrowserFileSystem(localStorage);
            const files = fs.readDirSync('/dir1/dir2/');
            expect(files).toEqual(['2']);
        });
    });

    describe('createDir', () => {
        it('should do nothing', () => {
            localStorage.setItem('backtrace__/dir1/dir2/1', 'test');

            const fs = new BrowserFileSystem(localStorage);
            fs.createDirSync('/a/b/c');

            expect(Object.keys(localStorage)).toEqual(['backtrace__/dir1/dir2/1']);
        });
    });

    describe('readFile', () => {
        it('should return key contents', () => {
            localStorage.setItem('backtrace__/dir1/dir2/1', 'test');

            const fs = new BrowserFileSystem(localStorage);
            const actual = fs.readFileSync('/dir1/dir2/1');

            expect(actual).toEqual('test');
        });

        it('should throw if key does not exist', () => {
            const fs = new BrowserFileSystem(localStorage);
            expect(() => fs.readFileSync('/dir1/dir2/1')).toThrow('path does not exist');
        });
    });

    describe('writeFile', () => {
        it('should write key contents', () => {
            const fs = new BrowserFileSystem(localStorage);
            fs.writeFileSync('/dir1/dir2/1', 'test');

            expect(localStorage.getItem('backtrace__/dir1/dir2/1')).toEqual('test');
        });

        it('should write key contents with relative path', () => {
            const fs = new BrowserFileSystem(localStorage);
            fs.writeFileSync('dir1/dir2/1', 'test');

            expect(localStorage.getItem('backtrace__/dir1/dir2/1')).toEqual('test');
        });
    });

    describe('unlink', () => {
        it('should remove file from storage', () => {
            localStorage.setItem('backtrace__/dir1/dir2/1', 'test');

            const fs = new BrowserFileSystem(localStorage);
            fs.unlinkSync('/dir1/dir2/1');

            expect(localStorage.getItem('backtrace__/dir1/dir2/1')).toBeNull();
        });

        it('should remove file from storage with relative path', () => {
            localStorage.setItem('backtrace__/dir1/dir2/1', 'test');

            const fs = new BrowserFileSystem(localStorage);
            fs.unlinkSync('dir1/dir2/1');

            expect(localStorage.getItem('backtrace__/dir1/dir2/1')).toBeNull();
        });

        it('should not throw if file does not exist', () => {
            const fs = new BrowserFileSystem(localStorage);
            expect(() => fs.unlinkSync('/dir1/dir2/1')).not.toThrow();
        });
    });

    describe('existsSync', () => {
        it('should return true if file exists', () => {
            localStorage.setItem('backtrace__/dir1/dir2/1', 'test');

            const fs = new BrowserFileSystem(localStorage);
            const exists = fs.existsSync('/dir1/dir2/1');

            expect(exists).toBe(true);
        });

        it('should return true if file exists wit relative path', () => {
            localStorage.setItem('backtrace__/dir1/dir2/1', 'test');

            const fs = new BrowserFileSystem(localStorage);
            const exists = fs.existsSync('dir1/dir2/1');

            expect(exists).toBe(true);
        });

        it('should return false if file does not exist', () => {
            const fs = new BrowserFileSystem(localStorage);
            const exists = fs.existsSync('/dir1/dir2/1');

            expect(exists).toBe(false);
        });
    });

    describe('createAttachment', () => {
        it('should create attachment from file contents', () => {
            localStorage.setItem('backtrace__/path/to/file.txt', 'file content');

            const fs = new BrowserFileSystem(localStorage);
            const attachment = fs.createAttachment('/path/to/file.txt');

            expect(attachment.name).toBe('file.txt');
            expect(attachment.get()).toBe('file content');
        });

        it('should create attachment from file contents with relative path', () => {
            localStorage.setItem('backtrace__/path/to/file.txt', 'file content');

            const fs = new BrowserFileSystem(localStorage);
            const attachment = fs.createAttachment('path/to/file.txt');

            expect(attachment.name).toBe('file.txt');
            expect(attachment.get()).toBe('file content');
        });

        it('should create attachment with custom name', () => {
            localStorage.setItem('backtrace__/path/to/file.txt', 'file content');

            const fs = new BrowserFileSystem(localStorage);
            const attachment = fs.createAttachment('/path/to/file.txt', 'custom-name.txt');

            expect(attachment.name).toBe('custom-name.txt');
            expect(attachment.get()).toBe('file content');
        });

        it('should throw if file does not exist', () => {
            const fs = new BrowserFileSystem(localStorage);
            expect(() => fs.createAttachment('/nonexistent/file.txt')).toThrow('path does not exist');
        });
    });
});
