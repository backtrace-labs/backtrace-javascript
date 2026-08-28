import { BacktraceReport, type BacktraceStackFrame } from '@backtrace/sdk-core';

export interface AnrThread {
    name: string;
    frames: BacktraceStackFrame[];
}

export function addOtherThreads(report: BacktraceReport, threads?: AnrThread[]): void {
    const usedNames = new Set(['main']);
    for (const thread of threads ?? []) {
        const base = thread.name || 'unknown';
        let name = base;
        for (let ordinal = 2; usedNames.has(name); ordinal++) {
            name = `${base}-${ordinal}`;
        }
        usedNames.add(name);
        report.addStackTrace(name, thread.frames);
    }
}
