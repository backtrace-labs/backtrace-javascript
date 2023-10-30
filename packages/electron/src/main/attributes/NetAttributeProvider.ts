import { net } from 'electron';

import { BacktraceAttributeProvider } from '@backtrace/sdk-core';

export class NetAttributeProvider implements BacktraceAttributeProvider {
    public readonly type = 'dynamic';

    public get(): Record<string, unknown> {
        return {
            'network.isOnline': net.online,
        };
    }
}
