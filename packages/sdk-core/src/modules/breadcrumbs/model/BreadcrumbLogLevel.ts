export enum BreadcrumbLogLevel {
    Verbose = 1 << 0,
    Debug = 1 << 1,
    Info = 1 << 2,
    Warning = 1 << 3,
    Error = 1 << 4,
}

export const defaultBreadcrumbsLogLevel = (1 << 5) - 1;
