import { EventEmitter } from 'stream';

export function forwardEvents<E extends EventEmitter>(from: E, to: E, ...events: string[]) {
    const fwd =
        (event: string) =>
        (...args: unknown[]) =>
            to.emit(event as string, ...args, to);

    const forwards: [string, ReturnType<typeof fwd>][] = [];
    for (const event of events) {
        const fn = fwd(event);
        from.on(event, fn);
        forwards.push([event, fn]);
    }

    const off = () => forwards.forEach(([event, fn]) => from.off(event, fn));
    return off;
}
