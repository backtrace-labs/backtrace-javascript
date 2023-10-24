import { BacktraceAttributeProvider } from '@backtrace/sdk-core';
import fs from 'fs';
import { MEMORY_ATTRIBUTE_MAP, MEMORY_INFORMATION_REGEX, PROCESS_STATUS_MAP } from './processStatusInformationMap';

export class LinuxProcessStatusAttributeProvider implements BacktraceAttributeProvider {
    private readonly _isLinux = process.platform === 'linux';
    public get type(): 'scoped' | 'dynamic' {
        return this._isLinux ? 'dynamic' : 'scoped';
    }
    public get(): Record<string, unknown> {
        if (!this._isLinux) {
            return {};
        }

        const memoryInformation = this.getMemoryInformation();
        const processInformation = this.getProcessStatus();
        return {
            ...memoryInformation,
            ...processInformation,
        };
    }

    private getMemoryInformation() {
        const result: Record<string, number> = {};
        let file = '';
        try {
            file = fs.readFileSync('/proc/meminfo', { encoding: 'utf8' });
        } catch (err) {
            return {};
        }

        const lines = file.trim().split('\n');
        for (const line of lines) {
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
            const units = match[3];
            if (units === 'kB') {
                number *= 1024;
            }
            result[attrName] = number;
        }

        return result;
    }

    private getProcessStatus() {
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
            result[item.attr] = item.parse(match[1], 10);
        }

        return result;
    }
}
