import type { BacktraceModule } from '@backtrace/sdk-core';
import { NativeModules } from 'react-native';
import type { BacktraceStorageModuleFactory } from './PathBacktraceStorageFactory';
import { type ReactNativeDirectoryProvider } from './ReactNativeDirectoryProvider';
import { type ReactNativeFileProvider } from './ReactNativeFileProvider';
import { type BacktraceStorageModule, type BacktraceStorageModuleOptions } from './storage';
import { FileWritableStream, type StreamWriter } from './StreamWriter';

export class ReactNativeBacktraceStorage implements BacktraceStorageModule, BacktraceModule {
    private readonly _fileSystemProvider: ReactNativeFileProvider = NativeModules.BacktraceFileSystemProvider;
    private readonly _directoryProvider: ReactNativeDirectoryProvider = NativeModules.BacktraceDirectoryProvider;
    private readonly _streamWriter: StreamWriter = NativeModules.StreamWriter;
    private readonly _path: string;
    private readonly _createDirectory: boolean;

    constructor(options: BacktraceStorageModuleOptions) {
        if (!this._fileSystemProvider) {
            throw new Error(`Cannot setup native binding. Missing file system provider`);
        }

        if (!this._directoryProvider) {
            throw new Error(`Cannot setup native binding. Missing directory provider`);
        }

        if (!this._streamWriter) {
            throw new Error(`Cannot setup native binding. Missing AlternatingFileWriter`);
        }

        // Remove trailing slashes and add a single slash at the end
        this._path = options.path.replaceAll(/\/+$/g, '') + '/';
        this._createDirectory = !!options.createDirectory;
    }

    public streamWriter: StreamWriter = this._streamWriter;

    public initialize(): void {
        if (this._createDirectory) {
            this.createDirSync(this._path);
        }
    }

    public createDirSync(dir: string): boolean {
        try {
            this._directoryProvider.createDirSync(dir);
            return true;
        } catch {
            return false;
        }
    }

    public getFullPath(path: string): string {
        return this.resolvePath(path);
    }

    public async get(key: string): Promise<string | undefined> {
        try {
            return await this._fileSystemProvider.readFile(this.resolvePath(key));
        } catch {
            return undefined;
        }
    }

    public getSync(key: string): string | undefined {
        try {
            return this._fileSystemProvider.readFileSync(this.resolvePath(key));
        } catch {
            return undefined;
        }
    }

    public async set(key: string, content: string): Promise<boolean> {
        try {
            await this._fileSystemProvider.writeFile(this.resolvePath(key), content);
            return true;
        } catch {
            return false;
        }
    }

    public setSync(key: string, content: string): boolean {
        try {
            this._fileSystemProvider.writeFileSync(this.resolvePath(key), content);
            return true;
        } catch {
            return false;
        }
    }

    public async remove(key: string): Promise<boolean> {
        try {
            await this._fileSystemProvider.unlink(this.resolvePath(key));
            return true;
        } catch {
            return false;
        }
    }

    public removeSync(key: string): boolean {
        try {
            this._fileSystemProvider.unlinkSync(this.resolvePath(key));
            return true;
        } catch {
            return false;
        }
    }

    public async has(key: string): Promise<boolean> {
        try {
            return await this._fileSystemProvider.exists(this.resolvePath(key));
        } catch {
            return false;
        }
    }

    public hasSync(key: string): boolean {
        try {
            return this._fileSystemProvider.existsSync(this.resolvePath(key));
        } catch {
            return false;
        }
    }

    public async *keys(): AsyncGenerator<string> {
        try {
            for (const key in this._directoryProvider.readDir(this._path)) {
                yield key;
            }
        } catch {
            return;
        }
    }

    public *keysSync(): Generator<string> {
        try {
            for (const key in this._directoryProvider.readDir(this._path)) {
                yield key;
            }
        } catch {
            return;
        }
    }

    public createWriteStream(key: string): FileWritableStream {
        return new FileWritableStream(this.resolvePath(key), this.streamWriter);
    }

    protected resolvePath(key: string) {
        if (key.startsWith('/')) {
            return key;
        }

        return this._path + key;
    }
}

export class ReactNativePathBacktraceStorageFactory implements BacktraceStorageModuleFactory {
    public create(options: BacktraceStorageModuleOptions): BacktraceStorageModule {
        return new ReactNativeBacktraceStorage(options);
    }
}
