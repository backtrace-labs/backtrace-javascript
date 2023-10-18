export interface ReactNativeDirectoryProvider {
    applicationDirectory(): string;

    readDir(dir: string): Promise<string[]>;
    readDirSync(dir: string): string[];

    createDir(dir: string): Promise<void>;
    createDirSync(dir: string): void;
}
