export interface TextBacktraceSubmitSourceCode {
    /**
     * A string that provides the full source file or a subset of it.
     * If provided, then also `startLine` should be provided. If not provided, then `path` must be provided.
     */
    text: string;

    /**
     * An integer value that provides the line number that the provided text starts on.
     * It is required if `text` is provided. First line is 1.
     */
    startLine: number;

    /**
     * An integer value that provides the column number that the first byte in the `text` segment is. First column is 1.
     */
    startColumn?: number;

    /**
     * An integer value that provides the absolute byte index in the original file that the provided segment is part of.
     * First byte is 0.
     */
    startPos?: number;

    /**
     * An integer value that informs source code display how many spaces a tab should represent.
     */
    tabWidth?: number;
}

export interface PathBacktraceSubmitSourceCode {
    /**
     * A string value that provides the file system path to the original source code file.
     * If not provided, then `text` must be provided.
     */
    path: string;

    /**
     * An integer value that provides the line number that the provided text starts on.
     * It is required if `text` is provided. First line is 1.
     */
    startLine?: number;

    /**
     * An integer value that provides the column number that the first byte in the `text` segment is. First column is 1.
     */
    startColumn?: number;

    /**
     * An integer value that provides the absolute byte index in the original file that the provided segment is part of.
     * First byte is 0.
     */
    startPos?: number;

    /**
     * An integer value that informs source code display how many spaces a tab should represent.
     */
    tabWidth?: number;
}

export type BacktraceSubmitSourceCode = TextBacktraceSubmitSourceCode | PathBacktraceSubmitSourceCode;
