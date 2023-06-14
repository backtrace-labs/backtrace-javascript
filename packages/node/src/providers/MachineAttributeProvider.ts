import { BacktraceAttributeProvider } from '@backtrace/sdk-core';
import os from 'os';

export class MachineAttributeProvider implements BacktraceAttributeProvider {
    public get type(): 'scoped' | 'dynamic' {
        return 'scoped';
    }
    public get(): Record<string, unknown> {
        return {
            'cpu.arch': os.arch(),
            'cpu.boottime': Math.floor(Date.now() / 1000) - os.uptime(),
            'cpu.count': os.cpus.length,
            'system.memory.total': os.totalmem(),
            hostname: os.hostname(),
            'uname.version': os.release(),
            'Environment Variables': process.env,
        };
    }
}
