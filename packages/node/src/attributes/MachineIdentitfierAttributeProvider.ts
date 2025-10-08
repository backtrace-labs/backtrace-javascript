import { BacktraceAttributeProvider, IdGenerator } from '@backtrace/sdk-core';
import { execSync } from 'child_process';
import crypto from 'crypto';

const UUID_REGEX = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i;
const DASHLESS_UUID_REGEX = /[a-f0-9]{32}/i;

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
        let machineId = this.getMachineId();
        if (machineId) {
            machineId = this.getValidGuid(machineId);
        } else {
            machineId = IdGenerator.uuid();
        }

        return {
            [this.MACHINE_ID_ATTRIBUTE]: machineId,
        };
    }

    public getMachineId() {
        switch (process.platform) {
            case 'win32': {
                return execSync(this.COMMANDS['win32']).toString().match(UUID_REGEX)?.[0].toLowerCase();
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

    private getValidGuid(input: string) {
        if (input.length === 36 && UUID_REGEX.test(input)) {
            return input;
        }

        if (input.length === 32 && DASHLESS_UUID_REGEX.test(input)) {
            return this.addDashesToUuid(input);
        }

        const sha = crypto.createHash('sha1').update(input).digest('hex').substring(0, 32);
        return this.addDashesToUuid(sha);
    }

    private addDashesToUuid(uuid: string) {
        return `${uuid.substring(0, 8)}-${uuid.substring(8, 12)}-${uuid.substring(12, 16)}-${uuid.substring(16, 20)}-${uuid.substring(20, 32)}`;
    }
}
