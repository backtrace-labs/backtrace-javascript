import { AttributeType, BacktraceAttributeProvider } from '@backtrace/sdk-core';
import os from 'os';

export class ProcessStatusAttributeProvider implements BacktraceAttributeProvider {
    public get type(): 'scoped' | 'dynamic' {
        return 'dynamic';
    }
    public get(): Record<string, unknown> {
        const processMemoryUsage = process.memoryUsage();

        const result: Record<string, AttributeType> = {
            'vm.rss.size': processMemoryUsage.rss,
            'gc.heap.total': processMemoryUsage.heapTotal,
            'gc.heap.used': processMemoryUsage.heapUsed,
            'process.age': Math.floor(process.uptime()),
            'system.memory.free': os.freemem(),
        };

        return result;
    }
}
