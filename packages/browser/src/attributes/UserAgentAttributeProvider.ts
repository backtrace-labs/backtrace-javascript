import { BacktraceAttributeProvider } from '@backtrace-labs/sdk-core';
import UAParser from 'ua-parser-js';

export class UserAgentAttributeProvider implements BacktraceAttributeProvider {
    public get type(): 'scoped' | 'dynamic' {
        return 'scoped';
    }
    public get(): Record<string, unknown> {
        const parser = new UAParser();
        const information = parser.getResult();

        return {
            'browser.name': information.browser.name,
            'browser.version': information.browser.version,
            'engine.name': information.engine.name,
            'engine.version': information.engine.version,
            'browser.platform': navigator.platform,
            'cpu.arch': information.cpu.architecture,
            'uname.sysname': information.os.name,
            'uname.version': information.os.version,
            'device.model': information.device.model,
            'device.type': information.device.type,
            'device.vendor': information.device.vendor,
            mobile: information.device.type === 'mobile',
            'user.agent.full': information.ua,
        };
    }
}
