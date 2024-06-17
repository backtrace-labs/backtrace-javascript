import { BacktraceAttributeProvider, IdGenerator } from '@backtrace/sdk-core';
import { execSync } from 'child_process';

export class MachineIdentitfierAttributeProvider implements BacktraceAttributeProvider {
    public static readonly SUPPORTED_PLATFORMS = ['win32', 'darwin', 'linux', 'freebsd'];
    private readonly MACHINE_ID_ATTRIBUTE = 'guid';

    private readonly COMMANDS = {
        win32: 'reg query "HKEY_LOCAL_MACHINE\\Software\\Microsoft\\Cryptography" /v MachineGuid',
        darwin: 'ioreg -rd1 -c IOPlatformExpertDevice',
        linux: '( cat /var/lib/dbus/machine-id /etc/machine-id 2> /dev/null || hostname ) | head -n 1 || :',
        freebsd: 'kenv -q smbios.system.uuid || sysctl -n kern.hostuuid',
    };

    public get type(): 'scoped' | 'dynamic' {
        return 'scoped';
    }
    public get(): Record<string, unknown> {
        const guid = this.generateGuid() ?? IdGenerator.uuid();

        return {
            [this.MACHINE_ID_ATTRIBUTE]: guid,
        };
    }

    public generateGuid() {
        switch (process.platform) {
            case 'win32': {
                return execSync(this.COMMANDS['win32'])
                    .toString()
                    .match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i)?.[0]
                    .toLowerCase();
            }
            case 'darwin': {
                return execSync(this.COMMANDS[process.platform])
                    .toString()
                    .split('IOPlatformUUID')[1]
                    .split('\n')[0]
                    .replace(/=|\s+|"/gi, '')
                    .toLowerCase();
            }
            case 'linux':
            case 'freebsd': {
                return execSync(this.COMMANDS[process.platform])
                    .toString()
                    .replace(/\r+|\n+|\s+/gi, '')
                    .toLowerCase();
            }
            default: {
                return null;
            }
        }
    }
}
