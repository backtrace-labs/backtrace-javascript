import { BacktraceStackFrame } from '@backtrace/sdk-core/src/model/data/BacktraceStackTrace';

/** React 16 component stacks need to be parsed separately. React 17+ component stacks can be parsed like Error stacks */
export function isReact16ComponentStack(stack: string): boolean {
    if (!stack) {
        return false;
    }
    const frames = stack.split('\n').filter((line) => !!line);
    for (const frame of frames) {
        if (!frame.includes('in ')) {
            return false;
        }
    }
    return true;
}

export function parseReact16ComponentStack(stack: string): BacktraceStackFrame[] {
    const btFrames: BacktraceStackFrame[] = [];
    if (!stack) {
        return btFrames;
    }
    const frames = stack.split('\n');
    for (const frame of frames) {
        if (!frame.trim()) continue;
        const component = frame.split('in ')[1]?.trim();
        const btFrame: BacktraceStackFrame = {
            funcName: component ?? 'unknown',
            library: 'unknown',
        };
        btFrames.push(btFrame);
    }
    return btFrames;
}
