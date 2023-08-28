import { BacktraceAttributeProvider } from '@backtrace-labs/sdk-core';
import os from 'os';

export class MachineAttributeProvider implements BacktraceAttributeProvider {
    public get type(): 'scoped' | 'dynamic' {
        return 'scoped';
    }
    public get(): Record<string, unknown> {
        const cpus = os.cpus();
        return {
            'cpu.arch': os.arch(),
            'cpu.boottime': Math.floor(Date.now() / 1000) - os.uptime(),
            'cpu.count': cpus.length,
            'cpu.brand': cpus[0].model,
            'cpu.frequency': cpus[0].speed,
            'system.memory.total': os.totalmem(),
            hostname: os.hostname(),
            'uname.version': os.release(),
            'Environment Variables': process.env,
        };
    }
}
