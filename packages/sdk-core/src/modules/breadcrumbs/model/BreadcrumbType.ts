export enum BreadcrumbType {
    Manual = 1 << 0,
    Log = 1 << 1,
    Navigation = 1 << 2,
    Http = 1 << 3,
    System = 1 << 4,
    User = 1 << 5,
    Configuration = 1 << 6,
}

export const defaultBreadcurmbType: BreadcrumbType = (1 << 7) - 1;
