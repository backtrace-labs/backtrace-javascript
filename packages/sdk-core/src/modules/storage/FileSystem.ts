import { BacktraceAttachment } from '../../model/attachment/index.js';

export interface FileSystem {
    readDir(dir: string): Promise<string[]>;
    readDirSync(dir: string): string[];

    createDir(dir: string): Promise<void>;
    createDirSync(dir: string): void;

    readFile(path: string): Promise<string>;
    readFileSync(path: string): string;

    writeFile(path: string, content: string): Promise<void>;
    writeFileSync(path: string, content: string): void;

    unlink(path: string): Promise<void>;
    unlinkSync(path: string): void;

    exists(path: string): Promise<boolean>;
    existsSync(path: string): boolean;

    createAttachment(path: string, name?: string): BacktraceAttachment;
}
