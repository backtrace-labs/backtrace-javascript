export interface BacktraceSubmitArch {
    /**
     * On some systems the running program can be run with a different arch than the system itself.
     * `attributes.uname.machine` has to do with the system arch;
     * this field has to do with the running process arch.
     */
    name: string;

    /**
     * It corresponds with registers in the stack frame. Specifies the names of the registers for this arch.
     * The values are the types.
     *
     * If you use `string`, you can format the value as you want.
     */
    registers: 'i32' | 'u32' | 'i64' | 'u64' | 'f32' | 'string';
}
