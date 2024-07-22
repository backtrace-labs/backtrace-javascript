import { BacktraceAttachment } from '@backtrace/sdk-core';
import fs from 'fs';
import { BacktraceFileAttachment } from '../attachment/index.js';
import { NodeFileSystem } from './interfaces/NodeFileSystem.js';

export class FsNodeFileSystem implements NodeFileSystem {
    public readDir(dir: string): Promise<string[]> {
        return fs.promises.readdir(dir);
    }

    public readDirSync(dir: string): string[] {
        return fs.readdirSync(dir);
    }

    public createDir(dir: string): Promise<void> {
        return fs.promises.mkdir(dir, { recursive: true }) as Promise<never>;
    }

    public createDirSync(dir: string): void {
        fs.mkdirSync(dir, { recursive: true });
    }

    public readFile(path: string): Promise<string> {
        return fs.promises.readFile(path, 'utf-8');
    }

    public readFileSync(path: string): string {
        return fs.readFileSync(path, 'utf-8');
    }

    public writeFile(path: string, content: string): Promise<void> {
        return fs.promises.writeFile(path, content);
    }

    public writeFileSync(path: string, content: string): void {
        fs.writeFileSync(path, content);
    }

    public unlink(path: string): Promise<void> {
        return fs.promises.unlink(path);
    }

    public unlinkSync(path: string): void {
        fs.unlinkSync(path);
    }

    public rename(oldPath: string, newPath: string): Promise<void> {
        return fs.promises.rename(oldPath, newPath);
    }

    public renameSync(oldPath: string, newPath: string): void {
        fs.renameSync(oldPath, newPath);
    }

    public createWriteStream(path: string): fs.WriteStream {
        return fs.createWriteStream(path, 'utf-8');
    }

    public createReadStream(path: string): fs.ReadStream {
        return fs.createReadStream(path, 'utf-8');
    }

    public async exists(path: string): Promise<boolean> {
        try {
            await fs.promises.stat(path);
            return true;
        } catch {
            return false;
        }
    }

    public existsSync(path: string): boolean {
        return fs.existsSync(path);
    }

    public createAttachment(path: string, name?: string): BacktraceAttachment<unknown> {
        return new BacktraceFileAttachment(path, name);
    }
}
