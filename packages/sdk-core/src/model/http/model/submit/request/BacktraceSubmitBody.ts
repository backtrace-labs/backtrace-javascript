import { BacktraceSubmitArch } from './BacktraceSubmitArch.js';
import { BacktraceSubmitAttributeType } from './BacktraceSubmitAttributeType.js';
import { BacktraceSubmitMemory } from './BacktraceSubmitMemory.js';
import { BacktraceSubmitModule } from './BacktraceSubmitModule.js';
import { BacktraceSubmitSourceCode } from './BacktraceSubmitSourceCode.js';
import { BacktraceSubmitThread } from './BacktraceSubmitThread.js';

export interface BacktraceSubmitBody {
    /**
     * 16 bytes of randomness in human readable UUID format.
     * The server will reject the request if UUID is already found.
     */
    uuid: string;

    /**
     * The UTC timestamp in seconds.
     */
    timestamp: number;

    /**
     * The name of the programming language/environment this error originates from.
     */
    lang: string;

    /**
     * The version of the programming language/environment this error originates from.
     */
    langVersion: string;

    /**
     * The name of the client that is sending this error report.
     */
    agent: string;

    /**
     * The version of the client that is sending this error report.
     */
    agentVersion: string;

    /**
     * Contains a map of all threads running in the environment. It could be only one.
     * The object is composed by the `main` object that is the key of the `threads` object
     * and represents the unique ID of a thread.
     */
    threads: Record<string, BacktraceSubmitThread>;

    /**
     * It represent the thread that either triggered the error or generated this object.
     * The value of this field should be one of the keys in the threads object and cannot be null.
     */
    mainThread: string;

    /**
     * Specifies the symbolication that needs to be applied.
     */
    symbolication?: 'sourcemap' | 'minidump' | 'proguard';

    /**
     * Specifies which thread is the entry point or the starting thread.
     * This must correspond to an entry in the threads field.
     */
    entryThread?: string;

    /**
     * Specifies the CPU architecture information. It is required if you want to have registers in the stack frame.
     */
    arch?: BacktraceSubmitArch;

    /**
     * This is a base64 encoded unique ID that groups the report with the same fingerprint (32 bytes).
     * If omitted, a fingerprint will be generated from the submitted stack trace.
     */
    fingerprint?: string;

    /**
     * List of strings which are report classifications.
     */
    classifiers?: string[];

    /**
     * This is a set of key-value pairs that belong to the error report.
     * The exact fields are not defined by this specification.
     * It is up to the JSON consumer how to display or otherwise represent key/value pairs in this object.
     * The value of a key-value pair can be a string, integer, or boolean.
     * These attributes are indexed and searchable.
     */
    attributes?: Record<string, BacktraceSubmitAttributeType>;

    /**
     * The object include the source code for better debugging experience.
     * The object is composed by the `sourceCodeId` object that is the ID of the source code.
     */
    sourceCode?: BacktraceSubmitSourceCode;

    /**
     * Provides arbitrary slices of memory.
     */
    memory?: BacktraceSubmitMemory[];

    /**
     * A generic, non-indexed user-provided property.
     * The names are free, the values can be of any type, and there is no limit to nesting.
     */
    annotations?: Record<string, unknown>;

    /**
     * A list of modules as loaded in memory, used to symbolicate stack traces.
     */
    modules?: BacktraceSubmitModule[];
}
