interface BaseBacktraceSubmitStackFrame {
    /**
     * A boolean value that is true if the stack frame is created by hueristic method due to missing CFI,
     * and false otherwise.
     */
    guessed_frame?: boolean;

    /**
     * A string value that identifies the function, method, or procedure name.
     * If not provided then `address` must be provided.
     */
    funcName?: string;

    /**
     * A string value that identifies the address of the stack frame. Required if `funcName` is not provided.
     */
    address?: string | number;

    /**
     * A string value that identifies the line number in the source code of the stack frame. First line is 1.
     */
    line?: number;

    /**
     * A string value that identifies the column number in the source code of the stack frame. First column is 1.
     */
    column?: number;

    /**
     * A string value that identifies the ID of the source code file the stack frame is contained in.
     */
    sourceCode?: string;

    /**
     * A string value that identifies the shared object, the library or the module name.
     */
    library: string;

    /**
     * A string value that identifies the debug identifier for the library associated with this frame.
     */
    debug_identifier?: string;

    /**
     * A boolean value that indicates if this frame is known to be the faulting frame.
     */
    faulted?: boolean;

    /**
     * In this object the keys are the register names. Use any names that make sense for the architecture.
     * These must correspond to the values in the `arch` definition.
     * JSON does not support 64 bit integers, so you must set the correct type
     * and then encode the 64 bit integers as a string.
     */
    registers?: Record<string, number | string>;
}

export interface FuncBacktraceSubmitStackFrame extends BaseBacktraceSubmitStackFrame {
    funcName: string;
}

export interface AddressBacktraceSubmitStackFrame extends BaseBacktraceSubmitStackFrame {
    address: string;
}

export type BacktraceSubmitStackFrame = FuncBacktraceSubmitStackFrame | AddressBacktraceSubmitStackFrame;
