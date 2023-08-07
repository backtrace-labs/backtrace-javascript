export interface Asset {
    readonly name: string;
    readonly path: string;
}

export interface AssetWithContent<T> extends Asset {
    readonly content: T;
}

export interface AssetWithDebugId extends Asset {
    readonly debugId: string;
}
