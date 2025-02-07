export interface BacktraceSubmitDataMemory {
    /**
     * An integer offset that this slice of memory starts at. The 64 bit integers are represented as strings.
     */
    start: number | string;

    /**
     * The number of bytes of the slice. Optional if you include `data`.
     */
    size?: number;

    /**
     * Base64 encoded bytes of the slice of memory. If provided, `size` can be inferred from it.
     */
    data: string;

    /**
     * The object that sets of permissions of this slice of memory.
     */
    perms?: {
        read?: boolean;
        write?: boolean;
        exec?: boolean;
    };
}

export interface BacktraceSubmitSizedMemory {
    /**
     * An integer offset that this slice of memory starts at. The 64 bit integers are represented as strings.
     */
    start: number | string;

    /**
     * The number of bytes of the slice. Optional if you include `data`.
     */
    size: number;

    /**
     * The object that sets of permissions of this slice of memory.
     */
    perms?: {
        read?: boolean;
        write?: boolean;
        exec?: boolean;
    };
}

export type BacktraceSubmitMemory = BacktraceSubmitDataMemory | BacktraceSubmitSizedMemory;
