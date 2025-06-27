import { BacktraceAttachment, BacktraceStringAttachment, FileSystem } from '@backtrace/sdk-core';

const PREFIX = 'backtrace__';

export class BrowserFileSystem implements FileSystem {
    constructor(private readonly _storage = window.localStorage) {}

    public async readDir(dir: string): Promise<string[]> {
        return this.readDirSync(dir);
    }

    public readDirSync(dir: string): string[] {
        dir = this.resolvePath(this.ensureTrailingSlash(dir));

        const result: string[] = [];
        for (const key in this._storage) {
            if (key.startsWith(dir)) {
                result.push(key.substring(dir.length));
            }
        }

        return result;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public async createDir(_dir: string): Promise<void> {
        return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public createDirSync(_dir: string): void {
        return;
    }

    public async readFile(path: string): Promise<string> {
        return this.readFileSync(path);
    }

    public readFileSync(path: string): string {
        const result = this._storage.getItem(this.resolvePath(path));
        if (!result) {
            throw new Error('path does not exist');
        }
        return result;
    }

    public async writeFile(path: string, content: string): Promise<void> {
        return this.writeFileSync(path, content);
    }

    public writeFileSync(path: string, content: string): void {
        this._storage.setItem(this.resolvePath(path), content);
    }

    public async unlink(path: string): Promise<void> {
        return this.unlinkSync(path);
    }

    public unlinkSync(path: string): void {
        this._storage.removeItem(this.resolvePath(path));
    }

    public async exists(path: string): Promise<boolean> {
        return this.existsSync(path);
    }

    public existsSync(path: string): boolean {
        return this.resolvePath(path) in this._storage;
    }

    public createAttachment(path: string, name?: string): BacktraceAttachment {
        return new BacktraceStringAttachment(name ?? path, this.readFileSync(path));
    }

    private resolvePath(key: string) {
        return PREFIX + key;
    }

    private ensureTrailingSlash(path: string) {
        if (path === '/') {
            return '//';
        }

        while (path.endsWith('/')) {
            path = path.substring(0, path.length - 1);
        }

        return path + '/';
    }
}
