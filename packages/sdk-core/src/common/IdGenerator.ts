import { pseudoRandomBytes } from 'crypto';
export class IdGenerator {
    public static uuid() {
        const bytes = pseudoRandomBytes(16);
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        return (
            bytes.slice(0, 4).toString('hex') +
            '-' +
            bytes.slice(4, 6).toString('hex') +
            '-' +
            bytes.slice(6, 8).toString('hex') +
            '-' +
            bytes.slice(8, 10).toString('hex') +
            '-' +
            bytes.slice(10, 16).toString('hex')
        );
    }
}
