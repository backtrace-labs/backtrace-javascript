import { BacktraceStorageModule } from '@backtrace/sdk-core';

export class BrowserBacktraceStorage implements BacktraceStorageModule {
    constructor(private readonly _storage = window.localStorage) {}

    public async set(key: string, value: string): Promise<boolean> {
        return this.setSync(key, value);
    }

    public async remove(key: string): Promise<boolean> {
        return this.removeSync(key);
    }

    public async get(key: string): Promise<string | undefined> {
        return this.getSync(key);
    }

    public async has(key: string): Promise<boolean> {
        return this.hasSync(key);
    }

    public setSync(key: string, value: string): boolean {
        try {
            this._storage.setItem(key, value);
            return true;
        } catch {
            return false;
        }
    }

    public removeSync(key: string): boolean {
        try {
            this._storage.removeItem(key);
            return true;
        } catch {
            return false;
        }
    }

    public getSync(key: string): string | undefined {
        try {
            return this._storage.getItem(key) ?? undefined;
        } catch {
            return undefined;
        }
    }

    public hasSync(key: string): boolean {
        return key in this._storage;
    }

    public async *keys(): AsyncGenerator<string> {
        for (const key of Object.keys(this._storage)) {
            yield key;
        }
    }

    public *keysSync(): Generator<string> {
        for (const key of Object.keys(this._storage)) {
            yield key;
        }
    }
}
