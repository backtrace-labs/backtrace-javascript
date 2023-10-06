import { type BacktraceAttachment } from '@backtrace-labs/sdk-core';
import { NativeModules } from 'react-native';
import { BacktraceFileAttachment } from '../attachment/BacktraceFileAttachment';
import { type FileSystem } from './FileSystem';
import { type ReactNativeBreadcrumbFile } from './ReactNativeBreadcrumbFile';
import { type ReactNativeDirectoryProvider } from './ReactNativeDirectoryProvider';
import { type ReactNativeFileProvider } from './ReactNativeFileProvider';
export class ReactNativeFileSystem implements FileSystem {
    private readonly _fileSystemProvider: ReactNativeFileProvider = NativeModules.BacktraceFileSystemProvider;
    private readonly _directoryProvider: ReactNativeDirectoryProvider = NativeModules.BacktraceDirectoryProvider;
    private readonly _breadcrumbFileManager: ReactNativeBreadcrumbFile = NativeModules.BreadcrumbFileManager;

    constructor() {
        if (!this._fileSystemProvider || !this._directoryProvider) {
            throw new Error(`Cannot setup native binding`);
        }
    }
    public breadcrumbProvider: ReactNativeBreadcrumbFile = this._breadcrumbFileManager;

    public applicationDirectory(): string {
        return this._directoryProvider.applicationDirectory();
    }

    public readDir(dir: string): Promise<string[]> {
        return this._directoryProvider.readDir(dir);
    }

    public readDirSync(dir: string): string[] {
        return this._directoryProvider.readDirSync(dir);
    }

    public createDir(dir: string): Promise<void> {
        return this._directoryProvider.createDir(dir);
    }

    public createDirSync(dir: string): void {
        return this._directoryProvider.createDirSync(dir);
    }

    public readFile(path: string): Promise<string> {
        return this._fileSystemProvider.readFile(path);
    }

    public readFileSync(path: string): string {
        return this._fileSystemProvider.readFileSync(path);
    }

    public writeFile(path: string, content: string): Promise<void> {
        return this._fileSystemProvider.writeFile(path, content);
    }

    public writeFileSync(path: string, content: string): void {
        return this._fileSystemProvider.writeFileSync(path, content);
    }

    public unlink(path: string): Promise<void> {
        return this._fileSystemProvider.unlink(path);
    }

    public unlinkSync(path: string): void {
        return this._fileSystemProvider.unlinkSync(path);
    }

    public exists(path: string): Promise<boolean> {
        return this._fileSystemProvider.exists(path);
    }

    public existsSync(path: string): boolean {
        return this._fileSystemProvider.existsSync(path);
    }

    public createAttachment(path: string, name?: string | undefined): BacktraceAttachment<unknown> {
        return new BacktraceFileAttachment(this._fileSystemProvider, path, name);
    }
}
