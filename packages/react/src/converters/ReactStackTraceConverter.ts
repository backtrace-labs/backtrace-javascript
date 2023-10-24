import { BacktraceStackFrame, BacktraceStackTraceConverter, JavaScriptEngine } from '@backtrace/browser';

export class ReactStackTraceConverter implements BacktraceStackTraceConverter {
    constructor(private readonly stackTraceConverter: BacktraceStackTraceConverter) {}

    get engine(): JavaScriptEngine {
        return this.stackTraceConverter.engine;
    }

    public convert(stackTrace: string, message = ''): BacktraceStackFrame[] {
        // React 16 component stacks are not JS error stacks, and need to be parsed separately
        if (this.isReact16ComponentStack(stackTrace)) {
            return this.parseReact16ComponentStack(stackTrace);
        }
        return this.stackTraceConverter.convert(stackTrace, message);
    }

    /**
     * React 16 component stacks need to be parsed separately. React 17+ component stacks can be parsed like Error stacks
     */
    private isReact16ComponentStack(stack: string): boolean {
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

    private parseReact16ComponentStack(stack: string): BacktraceStackFrame[] {
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
}
