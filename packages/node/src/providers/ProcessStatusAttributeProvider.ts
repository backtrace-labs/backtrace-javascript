import { BacktraceAttributeProvider } from '@backtrace/sdk-core';
import { AttributeType } from '@backtrace/sdk-core/src/model/data/BacktraceData';
import fs from 'fs';
import os from 'os';
const MEMORY_INFORMATION_REGEX = /^(.+):\s+(\d+)\s*(.+)?$/;
const MEMORY_ATTRIBUTE_MAP: Record<string, string> = {
    MemTotal: 'system.memory.total',
    MemFree: 'system.memory.free',
    MemAvailable: 'system.memory.available',
    Buffers: 'system.memory.buffers',
    Cached: 'system.memory.cached',
    SwapCached: 'system.memory.swap.cached',
    Active: 'system.memory.active',
    Inactive: 'system.memory.inactive',
    SwapTotal: 'system.memory.swap.total',
    SwapFree: 'system.memory.swap.free',
    Dirty: 'system.memory.dirty',
    Writeback: 'system.memory.writeback',
    Slab: 'system.memory.slab',
    VmallocTotal: 'system.memory.vmalloc.total',
    VmallocUsed: 'system.memory.vmalloc.used',
    VmallocChunk: 'system.memory.vmalloc.chunk',
};

const PROCESS_STATUS_MAP = [
    {
        re: /^nonvoluntary_ctxt_switches:\s+(\d+)$/m,
        parse: parseInt,
        attr: 'sched.cs.involuntary',
    },
    {
        re: /^voluntary_ctxt_switches:\s+(\d+)$/m,
        parse: parseInt,
        attr: 'sched.cs.voluntary',
    },
    { re: /^FDSize:\s+(\d+)$/m, parse: parseInt, attr: 'descriptor.count' },
    { re: /^FDSize:\s+(\d+)$/m, parse: parseInt, attr: 'descriptor.count' },
    { re: /^VmData:\s+(\d+)\s+kB$/m, parse: parseKb, attr: 'vm.data.size' },
    { re: /^VmLck:\s+(\d+)\s+kB$/m, parse: parseKb, attr: 'vm.locked.size' },
    { re: /^VmPTE:\s+(\d+)\s+kB$/m, parse: parseKb, attr: 'vm.pte.size' },
    { re: /^VmHWM:\s+(\d+)\s+kB$/m, parse: parseKb, attr: 'vm.rss.peak' },
    { re: /^VmRSS:\s+(\d+)\s+kB$/m, parse: parseKb, attr: 'vm.rss.size' },
    { re: /^VmLib:\s+(\d+)\s+kB$/m, parse: parseKb, attr: 'vm.shared.size' },
    { re: /^VmStk:\s+(\d+)\s+kB$/m, parse: parseKb, attr: 'vm.stack.size' },
    { re: /^VmSwap:\s+(\d+)\s+kB$/m, parse: parseKb, attr: 'vm.swap.size' },
    { re: /^VmPeak:\s+(\d+)\s+kB$/m, parse: parseKb, attr: 'vm.vma.peak' },
    { re: /^VmSize:\s+(\d+)\s+kB$/m, parse: parseKb, attr: 'vm.vma.size' },
];

function parseKb(str: string): number {
    return parseInt(str, 10) * 1024;
}

export class ProcessStatusAttributeProvider implements BacktraceAttributeProvider {
    public get type(): 'scoped' | 'dynamic' {
        return 'dynamic';
    }
    public get(): Record<string, unknown> {
        const memoryInformation = this.getMemoryInformation(process.platform);
        const processInformation = this.getProcessStatus(process.platform);
        const processMemoryUsage = process.memoryUsage();

        const result: Record<string, AttributeType> = {
            'vm.rss.size': processMemoryUsage.rss,
            'gc.heap.total': processMemoryUsage.heapTotal,
            'gc.heap.used': processMemoryUsage.heapUsed,
            'process.age': Math.floor(process.uptime()),
            'system.memory.free': os.freemem(),
            ...memoryInformation,
            ...processInformation,
        };

        return result;
    }

    private getMemoryInformation(sys: string) {
        if (sys !== 'linux') {
            return {};
        }
        const result: Record<string, number> = {};
        let file = '';
        try {
            file = fs.readFileSync('/proc/meminfo', { encoding: 'utf8' });
        } catch (err) {
            return {};
        }

        const lines = file.split('\n');
        for (const line of lines) {
            if (!line) {
                continue;
            }
            const match = line.match(MEMORY_INFORMATION_REGEX);
            if (!match) {
                continue;
            }
            const name = match[1];
            const attrName = MEMORY_ATTRIBUTE_MAP[name];
            if (!attrName) {
                continue;
            }

            let number = parseInt(match[2], 10);
            let units = match[3];
            if (number === 0) {
                units = 'B';
            }
            if (units === 'B' || units === 'bytes') {
                number *= 1;
            } else if (units === 'kB') {
                number *= 1024;
            } else {
                continue;
            }
            result[attrName] = number;
        }

        return result;
    }

    private getProcessStatus(sys: string) {
        if (sys !== 'linux') {
            return {};
        }
        // Justification for doing this synchronously:
        // * We need to collect this information in the process uncaughtException handler, in which the
        //   event loop is not safe to use.
        // * We are collecting a snapshot of virtual memory used. If this is done asynchronously, then
        //   we may pick up virtual memory information for a time different than the moment we are
        //   interested in.
        // * procfs is a virtual filesystem; there is no disk I/O to block on. It's synchronous anyway.
        let contents;
        try {
            contents = fs.readFileSync('/proc/self/status', { encoding: 'utf8' });
        } catch (err) {
            return {};
        }
        const result: Record<string, number> = {};

        for (let i = 0; i < PROCESS_STATUS_MAP.length; i += 1) {
            const item = PROCESS_STATUS_MAP[i];
            const match = contents.match(item.re);
            if (!match) {
                continue;
            }
            result[item.attr] = item.parse(match[1]);
        }

        return result;
    }
}
