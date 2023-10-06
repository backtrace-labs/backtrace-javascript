export interface ReactNativeBreadcrumbFile {
    use(source: string, fallbackFile: string, maximumBreadcrumbs: number): void;
    append(line: string): Promise<boolean>;
}
