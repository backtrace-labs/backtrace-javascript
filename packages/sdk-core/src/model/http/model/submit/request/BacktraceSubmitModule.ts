export interface BacktraceSubmitModule {
    /**
     * An integer offset that the module starts at. 64 bit integers are represented as strings.
     */
    start: number | string;

    /**
     * The number of bytes occupied by the module.
     */
    size: number | string;

    /**
     * A string that indicates the path that the module is loaded from.
     */
    code_file?: string;

    /**
     * The human-readable version string for the module.
     */
    version?: string;

    /**
     * The file containing debug information for the module.
     */
    debug_file?: string;

    /**
     * The debug file identifier.
     */
    debug_identifier?: string;

    /**
     * A boolean value that indicates if symbolication was able to locate the debug file.
     */
    debug_file_exists?: boolean;
}
