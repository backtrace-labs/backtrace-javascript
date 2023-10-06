export interface ReactNativeFileProvider {
    readFile(path: string): Promise<string>;
    readFileSync(path: string): string;

    writeFile(path: string, content: string): Promise<void>;
    writeFileSync(path: string, content: string): void;

    unlink(path: string): Promise<void>;
    unlinkSync(path: string): void;

    exists(path: string): Promise<boolean>;
    existsSync(path: string): boolean;
}
