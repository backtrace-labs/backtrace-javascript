export function bytesToUuid(bytes: Buffer) {
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
