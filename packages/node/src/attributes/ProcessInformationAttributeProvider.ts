import { BacktraceAttributeProvider } from '@backtrace/sdk-core';

export class ProcessInformationAttributeProvider implements BacktraceAttributeProvider {
    public get type(): 'scoped' | 'dynamic' {
        return 'scoped';
    }
    public get(): Record<string, unknown> {
        return {
            application: process.title,
            // this information is only available if someone uses npm command
            // If it isn't we have to get this information in a different way
            // probably by reading the package.json file or process info
            'application.version': process.env.npm_package_version,
            'process.thread.count': 1,
            pid: process.pid,
            'uname.machine': process.arch,
            'uname.sysname': process.platform,
            environment: process.env.NODE_ENV,
        };
    }
}
