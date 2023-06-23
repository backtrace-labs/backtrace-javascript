import { BacktraceAttributeProvider } from '@backtrace/sdk-core';

export class ProcessInformationAttributeProvider implements BacktraceAttributeProvider {
    public get type(): 'scoped' | 'dynamic' {
        return 'scoped';
    }
    public get(): Record<string, unknown> {
        return {
            'process.thread.count': 1,
            'process.cwd': process.cwd(),
            pid: process.pid,
            'uname.machine': process.arch,
            'uname.sysname': this.convertPlatformToAttribute(process.platform),
            environment: process.env.NODE_ENV,
            'debug.port': process.debugPort,
            'Exec Arguments': process.execArgv,
        };
    }

    private convertPlatformToAttribute(platform: NodeJS.Platform): string {
        switch (platform) {
            case 'win32': {
                return 'Windows';
            }
            case 'darwin': {
                return 'Mac OS';
            }
            default: {
                return platform.charAt(0).toUpperCase() + platform.slice(1);
            }
        }
    }
}
