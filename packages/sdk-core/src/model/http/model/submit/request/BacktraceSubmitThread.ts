import { BacktraceSubmitStackFrame } from './BacktraceSubmitStackFrame.js';

/**
 * Contains a map of all threads running in the environment. It could be only one.
 * The object is composed by the `main` object that is the key of the `threads` object
 * and represents the unique ID of a thread.
 */
export interface BacktraceSubmitThread {
    /**
     * A string that provides a small description of what the thread does.
     */
    name: string;

    /**
     * A boolean value that denotes if a thread is a faulting thread.
     * Rarely two faulted threads can be seen, if it happens,
     * the first faulting thread listed gets the status of `mainThread`.
     */
    fault: boolean;

    stack: BacktraceSubmitStackFrame[];
}
