import crypto from 'crypto';
import { bytesToUuid } from './bytesToUuid';

export function stringToUuid(str: string) {
    const bytes = crypto.createHash('sha1').update(str).digest();
    return bytesToUuid(bytes);
}
