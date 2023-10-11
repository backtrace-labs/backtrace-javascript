import { type BacktraceAttachment } from '@backtrace-labs/sdk-core';
import { NativeModules } from 'react-native';
import { BacktraceFileAttachment } from '../attachment/BacktraceFileAttachment';
import { type FileSystem } from './FileSystem';
import { type ReactNativeDirectoryProvider } from './ReactNativeDirectoryProvider';
import { type ReactNativeFileProvider } from './ReactNativeFileProvider';
import { type StreamWriter } from './StreamWriter';
export class ReactNativeFileSystem implements FileSystem {
    private readonly _fileSystemProvider: ReactNativeFileProvider = NativeModules.BacktraceFileSystemProvider;
    private readonly _directoryProvider: ReactNativeDirectoryProvider = NativeModules.BacktraceDirectoryProvider;
    private readonly _streamWriter: StreamWriter = NativeModules.StreamWriter;

    constructor() {
        if (!this._fileSystemProvider) {
            throw new Error(`Cannot setup native binding. Missing file system provider`);
        }

        if (!this._directoryProvider) {
            throw new Error(`Cannot setup native binding. Missing directory provider`);
        }

        if (!this._streamWriter) {
            throw new Error(`Cannot setup native binding. Missing AlternatingFileWriter`);
        }
    }

    public streamWriter: StreamWriter = this._streamWriter;

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

    public rename(sourceFile: string, destinationFile: string): Promise<boolean> {
        return this._fileSystemProvider.rename(sourceFile, destinationFile);
    }

    public renameSync(sourceFile: string, destinationFile: string): boolean {
        return this._fileSystemProvider.renameSync(sourceFile, destinationFile);
    }

    public createAttachment(path: string, name?: string | undefined): BacktraceAttachment<unknown> {
        return new BacktraceFileAttachment(this._fileSystemProvider, path, name);
    }
}
