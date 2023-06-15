import { BacktraceAttributeProvider, IdGenerator } from '@backtrace/sdk-core';
import { execSync } from 'child_process';
import { getValue, HKEY } from 'native-reg';

export class MachineIdentitfierAttributeProvider implements BacktraceAttributeProvider {
    private readonly MACHINE_ID_ATTRIBUTE = 'guid';

    private readonly COMMANDS = {
        darwin: 'ioreg -rd1 -c IOPlatformExpertDevice',
        linux: '( cat /var/lib/dbus/machine-id /etc/machine-id 2> /dev/null || hostname ) | head -n 1 || :',
        freebsd: 'kenv -q smbios.system.uuid || sysctl -n kern.hostuuid',
    };

    public get type(): 'scoped' | 'dynamic' {
        return 'scoped';
    }
    public get(): Record<string, unknown> {
        const guid = this.generateGuid();

        return {
            [this.MACHINE_ID_ATTRIBUTE]: guid ?? IdGenerator.uuid(),
        };
    }

    private generateGuid() {
        switch (process.platform) {
            case 'win32': {
                return this.getWindowsMachineId()
                    ?.replace(/\r+|\n+|\s+/gi, '')
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

    private getWindowsMachineId() {
        const regVal = getValue(HKEY.LOCAL_MACHINE, 'SOFTWARE\\Microsoft\\Cryptography', 'MachineGuid');
        return regVal?.toString();
    }
}
