import nodeFs from 'fs';
import path from 'path';
import { BacktraceStorageModule, BacktraceStorageModuleOptions } from './BacktraceStorage.js';
import { BacktraceStorageModuleFactory } from './BacktraceStorageModuleFactory.js';
import { NodeFs } from './nodeFs.js';

export class NodeFsBacktraceStorage implements BacktraceStorageModule {
    private readonly _path: string;
    private readonly _fs: NodeFs;
    private readonly _createDirectory: boolean;

    constructor(options: BacktraceStorageModuleOptions) {
        this._path = options.path;
        this._fs = options.fs ?? nodeFs;
        this._createDirectory = !!options.createDirectory;
    }

    public initialize() {
        if (this._createDirectory) {
            this._fs.mkdirSync(this._path, { recursive: true });
        }
    }

    public setSync(key: string, value: string): boolean {
        try {
            this._fs.writeFileSync(this.resolvePath(key), value);
            return true;
        } catch {
            return false;
        }
    }

    public removeSync(key: string): boolean {
        try {
            this._fs.unlinkSync(this.resolvePath(key));
            return true;
        } catch {
            return false;
        }
    }

    public getSync(key: string): string | undefined {
        try {
            return this._fs.readFileSync(this.resolvePath(key), 'utf-8');
        } catch {
            return undefined;
        }
    }

    public hasSync(key: string): boolean {
        try {
            this._fs.statSync(this.resolvePath(key));
            return true;
        } catch {
            return false;
        }
    }

    public async set(key: string, value: string): Promise<boolean> {
        try {
            await this._fs.promises.writeFile(this.resolvePath(key), value);
            return true;
        } catch {
            return false;
        }
    }

    public async remove(key: string): Promise<boolean> {
        try {
            await this._fs.promises.unlink(this.resolvePath(key));
            return true;
        } catch {
            return false;
        }
    }

    public async get(key: string): Promise<string | undefined> {
        try {
            return await this._fs.promises.readFile(this.resolvePath(key), 'utf-8');
        } catch {
            return undefined;
        }
    }

    public async has(key: string): Promise<boolean> {
        try {
            await this._fs.promises.stat(this.resolvePath(key));
            return true;
        } catch {
            return false;
        }
    }

    public *keysSync(): Generator<string> {
        try {
            for (const entry of this._fs.readdirSync(this._path, { withFileTypes: true })) {
                if (entry.isFile()) {
                    yield entry.name;
                }
            }
        } catch {
            return;
        }
    }

    public async *keys(): AsyncGenerator<string> {
        try {
            for (const entry of await this._fs.promises.readdir(this._path, { withFileTypes: true })) {
                if (entry.isFile()) {
                    yield entry.name;
                }
            }
        } catch {
            return;
        }
    }

    public createWriteStream(key: string): nodeFs.WriteStream {
        return this._fs.createWriteStream(this.resolvePath(key), 'utf-8');
    }

    public createReadStream(key: string): nodeFs.ReadStream {
        return this._fs.createReadStream(this.resolvePath(key), 'utf-8');
    }

    protected resolvePath(key: string) {
        return path.resolve(this._path, key);
    }
}

export class NodeFsBacktraceStorageModuleFactory implements BacktraceStorageModuleFactory {
    public create(options: BacktraceStorageModuleOptions): BacktraceStorageModule {
        return new NodeFsBacktraceStorage(options);
    }
}
