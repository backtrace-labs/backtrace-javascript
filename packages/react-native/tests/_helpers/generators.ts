import readline from 'readline';
import { Readable } from 'stream';
import { createRng } from './random';

const rng = createRng();

export function dataStream<W>(data: W) {
    return new ReadableStream<W>({
        start(controller) {
            controller.enqueue(data);
            controller.close();
        },
    });
}

export function generatorStream<W>(generator: Generator<W>) {
    return new ReadableStream<W>({
        pull(controller) {
            const { value, done } = generator.next();
            if (done) {
                return controller.close();
            }
            controller.enqueue(value);
        },
    });
}

export function randomLines(count: number, minLineLength: number, maxLineLength: number) {
    return [...new Array(count)].map(() => rng.string(rng.intBetween(minLineLength, maxLineLength)));
}

export async function readLines(readable: ReadableStream, lines: number) {
    const result: string[] = [];
    const rl = readline.createInterface(Readable.from(readable));

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

export function randomString(count: number) {
    let generated = 0;

    return new ReadableStream<string>({
        pull(controller) {
            const remaining = count - generated;
            if (remaining <= 0) {
                return controller.close();
            }
            const chunk = rng.string(Math.min(remaining, 16384));
            generated += chunk.length;
            controller.enqueue(chunk);
        },
    });
}

export async function readToEnd(readable: ReadableStream) {
    const result: string[] = [];
    const reader = readable.getReader();

    // eslint-disable-next-line no-constant-condition
    while (true) {
        const { done, value } = await reader.read();
        if (value === undefined) {
            break;
        }

        result.push(value);
        if (done) {
            break;
        }
    }

    return result.join('');
}
