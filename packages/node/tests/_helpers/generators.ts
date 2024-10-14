import readline from 'readline';
import { Readable, Transform } from 'stream';
import { createRng } from './random.js';

const rng = createRng();

export function randomLines(minLineLength: number, maxLineLength: number) {
    const str = randomString();

    return new Readable({
        read(size) {
            let buffer = '';
            while (buffer.length < size) {
                const lineLength = rng.intBetween(minLineLength, maxLineLength);
                const line = str.read(lineLength) + '\n';
                buffer += line;
            }
            this.push(buffer.substring(0, size));
        },
    });
}

export function lines(minLineLength: number, maxLineLength: number) {
    let counter = 0;

    return new Readable({
        read(size) {
            let buffer = '';
            while (buffer.length < size) {
                const lineLength = rng.intBetween(minLineLength, maxLineLength);
                const line = counter + '_'.repeat(lineLength - 2) + counter + '\n';
                buffer += line;
                counter = (counter + 1) % 10;
            }
            this.push(buffer.substring(0, size));
        },
    });
}

export function limit(count: number) {
    let seen = 0;

    return new Transform({
        transform(chunk: Buffer, _, callback) {
            const remaining = count - seen;
            if (remaining <= 0) {
                this.push(null);
                return;
            }
            seen += chunk.length;
            this.push(chunk.subarray(0, remaining));
            callback();
        },
    });
}

export function limitLines(count: number) {
    let seen = 0;

    return new Transform({
        transform(chunk: Buffer) {
            const remaining = count - seen;
            if (chunk.length >= remaining) {
                this.push(null);
                return;
            }
            seen += chunk.length;
            this.push(chunk.subarray(0, remaining));
        },
    });
}

export async function readLines(readable: Readable, lines: number) {
    const rl = readline.createInterface(readable);
    const result: string[] = [];

    let count = 0;
    for await (const line of rl) {
        result.push(line);
        if (++count === lines) {
            break;
        }
    }

    rl.close();
    return result;
}

export function randomString() {
    return new Readable({
        read(size) {
            this.push(rng.string(size));
        },
    });
}
