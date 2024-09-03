import crypto from 'crypto';

export function randomToken() {
    return crypto.randomBytes(32).toString('hex');
}
