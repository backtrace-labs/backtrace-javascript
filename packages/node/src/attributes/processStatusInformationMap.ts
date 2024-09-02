import { UnitConverter } from '../common/UnitConverter.js';

export const MEMORY_INFORMATION_REGEX = /^(.+):\s+(\d+)\s*(.+)?$/;
export const MEMORY_ATTRIBUTE_MAP: Record<string, string> = {
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

export const PROCESS_STATUS_MAP = [
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
    { re: /^VmData:\s+(\d+)\s+kB$/m, parse: UnitConverter.parseKb, attr: 'vm.data.size' },
    { re: /^VmLck:\s+(\d+)\s+kB$/m, parse: UnitConverter.parseKb, attr: 'vm.locked.size' },
    { re: /^VmPTE:\s+(\d+)\s+kB$/m, parse: UnitConverter.parseKb, attr: 'vm.pte.size' },
    { re: /^VmHWM:\s+(\d+)\s+kB$/m, parse: UnitConverter.parseKb, attr: 'vm.rss.peak' },
    { re: /^VmRSS:\s+(\d+)\s+kB$/m, parse: UnitConverter.parseKb, attr: 'vm.rss.size' },
    { re: /^VmLib:\s+(\d+)\s+kB$/m, parse: UnitConverter.parseKb, attr: 'vm.shared.size' },
    { re: /^VmStk:\s+(\d+)\s+kB$/m, parse: UnitConverter.parseKb, attr: 'vm.stack.size' },
    { re: /^VmSwap:\s+(\d+)\s+kB$/m, parse: UnitConverter.parseKb, attr: 'vm.swap.size' },
    { re: /^VmPeak:\s+(\d+)\s+kB$/m, parse: UnitConverter.parseKb, attr: 'vm.vma.peak' },
    { re: /^VmSize:\s+(\d+)\s+kB$/m, parse: UnitConverter.parseKb, attr: 'vm.vma.size' },
];
