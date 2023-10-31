export function log(message: string) {
    process.stderr.write(message + '\n');
}
